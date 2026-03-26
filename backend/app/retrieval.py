from __future__ import annotations

import pickle
import os
from pathlib import Path
from typing import Any

import certifi
import numpy as np
import requests
from fastapi import HTTPException, status

from app.config import settings

try:
    import faiss  # type: ignore
except Exception:  # noqa: BLE001
    faiss = None  # type: ignore


_REPO_ROOT = Path(__file__).resolve().parents[2]
_LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec/v1"


def _resolve_repo_path(raw_path: str) -> Path:
    p = Path(raw_path)
    if not p.is_absolute():
        p = _REPO_ROOT / p
    return p


def _ensure_real_asset(path: Path, label: str) -> None:
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{label} not found at {path}. Provide the real file and retry.",
        )
    header = path.read_text(encoding="utf-8", errors="ignore")[:80]
    if _LFS_POINTER_PREFIX in header:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"{label} is a Git LFS pointer, not real data. "
                "Run `git lfs pull` to fetch actual ML assets."
            ),
        )


def generate_embedding(text: str) -> list[float]:
    if not settings.huggingface_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HUGGINGFACE_API_KEY is not configured.",
        )

    model = settings.hf_embedding_model.strip()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HF_EMBEDDING_MODEL is not configured.",
        )

    url = f"https://router.huggingface.co/hf-inference/models/{model}"
    headers = {
        "Authorization": f"Bearer {settings.huggingface_api_key}",
        "Content-Type": "application/json",
    }
    payload = {"inputs": text, "options": {"wait_for_model": True}}

    session = requests.Session()
    session.trust_env = False
    session.verify = certifi.where()
    # Guard against broken global env cert paths on Windows setups.
    prev_req = os.environ.pop("REQUESTS_CA_BUNDLE", None)
    prev_ssl = os.environ.pop("SSL_CERT_FILE", None)
    try:
        res = session.post(url, headers=headers, json=payload, timeout=40)
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to reach Hugging Face embedding API.",
        ) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Embedding API TLS setup failed due to local CA/certificate environment settings. "
                "Unset broken REQUESTS_CA_BUNDLE/SSL_CERT_FILE (or fix their paths) and retry."
            ),
        ) from exc
    finally:
        if prev_req is not None:
            os.environ["REQUESTS_CA_BUNDLE"] = prev_req
        if prev_ssl is not None:
            os.environ["SSL_CERT_FILE"] = prev_ssl

    if not res.ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Hugging Face embedding API error: {res.status_code} {res.text[:300]}",
        )

    body = res.json()
    arr = np.array(body, dtype=np.float32)
    # HF feature extraction can return [tokens, dims] or [batch, tokens, dims]
    if arr.ndim == 3 and arr.shape[0] == 1:
        arr = arr[0]
    if arr.ndim == 2:
        arr = arr.mean(axis=0)
    if arr.ndim != 1:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding API returned an unexpected tensor shape.",
        )
    return arr.astype(np.float32).tolist()


def _load_faiss_index():
    if faiss is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="faiss is not installed. Install faiss-cpu to enable vector retrieval.",
        )
    index_path = _resolve_repo_path(settings.faiss_index_path)
    _ensure_real_asset(index_path, "FAISS index")
    return faiss.read_index(str(index_path))


def _load_mapping() -> Any:
    mapping_path = _resolve_repo_path(settings.faiss_mapping_path)
    _ensure_real_asset(mapping_path, "FAISS mapping")
    try:
        with open(mapping_path, "rb") as f:
            return pickle.load(f)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load FAISS mapping pickle.",
        ) from exc


def _map_idx_to_metadata_id(mapping: Any, idx: int) -> int | str:
    if isinstance(mapping, dict):
        val = mapping.get(idx, idx)
        return val if isinstance(val, (int, str)) else idx
    if isinstance(mapping, list):
        if 0 <= idx < len(mapping):
            val = mapping[idx]
            return val if isinstance(val, (int, str)) else idx
        return idx
    return idx


def retrieve_top_k(vector: list[float], k: int) -> tuple[list[float], list[int | str]]:
    index = _load_faiss_index()
    mapping = _load_mapping()
    q = np.array(vector, dtype=np.float32).reshape(1, -1)

    if q.shape[1] != index.d:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Embedding dimension mismatch: vector={q.shape[1]} vs index={index.d}.",
        )

    k_eff = max(1, min(k, int(index.ntotal))) if index.ntotal > 0 else 0
    if k_eff == 0:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FAISS index is empty.",
        )

    distances, indices = index.search(q, k_eff)
    raw_scores = distances[0].tolist()
    raw_ids = indices[0].tolist()
    ids = [_map_idx_to_metadata_id(mapping, int(i)) for i in raw_ids]
    # Convert L2 distance to bounded similarity-like value for downstream consistency.
    scores = [float(1.0 / (1.0 + max(0.0, d))) for d in raw_scores]
    return scores, ids
