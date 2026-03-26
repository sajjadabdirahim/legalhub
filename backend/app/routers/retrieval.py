from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.config import settings
from app.deps import get_current_user_id
from app.retrieval import generate_embedding, retrieve_top_k
from app.validation import validate_and_sanitize_chat_input

router = APIRouter(tags=["retrieval"])


class ExternalTopic(BaseModel):
    topic: str
    confidence: float = Field(ge=0.0, le=1.0)


class RetrievalRequest(BaseModel):
    sanitized_input: str = Field(..., min_length=1, max_length=500)
    mode: Literal["citizen", "professional"]
    external_topic: ExternalTopic | None = None
    k: int | None = Field(default=None, ge=1, le=50)


class RetrievalResponse(BaseModel):
    vector: list[float]
    scores: list[float]
    ids: list[int | str]
    topic: str | None = None
    topic_confidence: float | None = None


@router.post("/retrieval/step2", response_model=RetrievalResponse)
def embedding_and_vector_retrieval(
    body: RetrievalRequest,
    _: str = Depends(get_current_user_id),
) -> RetrievalResponse:
    """
    Step 2: generate embedding, query FAISS kNN, and pass through external topic for professional mode.
    """
    # Defensive check in case caller bypasses Step 1 and passes unsanitized text.
    validation = validate_and_sanitize_chat_input(body.sanitized_input)
    if not validation.ok or validation.sanitized is None:
        # Reuse step-1 behavior by raising a standard 400 from retrieval path.
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation.error)

    vector = generate_embedding(validation.sanitized)
    k = body.k if body.k is not None else settings.faiss_top_k
    scores, ids = retrieve_top_k(vector, int(k))

    topic = None
    topic_confidence = None
    if body.mode == "professional" and body.external_topic is not None:
        topic = body.external_topic.topic
        topic_confidence = body.external_topic.confidence

    return RetrievalResponse(
        vector=vector,
        scores=scores,
        ids=ids,
        topic=topic,
        topic_confidence=topic_confidence,
    )
