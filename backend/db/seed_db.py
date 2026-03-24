import json
import os
import sys
import uuid
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.orm import Session  # noqa: E402

from app.db.models import (  # noqa: E402
    Amendment,
    Base,
    Provision,
    Statute,
    StructuralDivision,
)
from app.db.session import SessionLocal, engine  # noqa: E402

REPO_ROOT = BACKEND_ROOT.parent
env_path = REPO_ROOT / ".env"
load_dotenv(env_path)


def _parse_date(val):
    if val is None or val == "":
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    s = str(val).strip()[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


def _uuid(val) -> uuid.UUID:
    if isinstance(val, uuid.UUID):
        return val
    return uuid.UUID(str(val))


def _truncate(s: str | None, n: int) -> str | None:
    if s is None:
        return None
    s = str(s)
    return s if len(s) <= n else s[:n]


def _map_statute(row: dict) -> dict:
    return {
        "statute_id": _uuid(row["statute_id"]),
        "title": row["title"],
        "statute_type": row.get("statute_type"),
        "cap_number": row.get("cap_number"),
        "frbr_uri": row.get("frbr_uri"),
        "latest_version_date": _parse_date(row.get("latest_version_date")),
    }


def _map_amendment(row: dict) -> dict:
    return {
        "amendment_id": _uuid(row["amendment_id"]),
        "statute_id": _uuid(row["statute_id"]),
        "amending_law_title": row.get("amending_law_title"),
        "amendment_date": _parse_date(row.get("amendment_date")),
    }


def _map_division(row: dict) -> dict:
    return {
        "division_id": _uuid(row["division_id"]),
        "statute_id": _uuid(row["statute_id"]),
        "parent_division_id": _uuid(row["parent_division_id"]) if row.get("parent_division_id") else None,
        "division_type": row.get("division_type"),
        "division_number": _truncate(row.get("division_number"), 20),
        "heading": _truncate(row.get("heading"), 255),
    }


def _map_provision(row: dict) -> dict:
    return {
        "provision_id": _uuid(row["provision_id"]),
        "division_id": _uuid(row["division_id"]),
        "provision_number": _truncate(row.get("provision_number"), 20),
        "heading": _truncate(row.get("heading"), 255),
        "akn_eid": row.get("akn_eid"),
        "clean_text": row["clean_text"],
        "status": row.get("status"),
    }


def seed_database(*, reset: bool = True) -> None:
    json_path = REPO_ROOT / "ml_pipeline" / "data" / "processed" / "relational_database_seed.json"
    if not json_path.is_file():
        print(f"Seed JSON not found at {json_path}. Creating tables only.")
        Base.metadata.create_all(bind=engine)
        return

    print("Applying schema and loading seed data...")
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    session: Session = SessionLocal()
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    try:
        print(f"Inserting {len(data['statutes'])} statutes...")
        session.bulk_insert_mappings(Statute, [_map_statute(r) for r in data["statutes"]])

        print(f"Inserting {len(data['amendments'])} amendments...")
        session.bulk_insert_mappings(Amendment, [_map_amendment(r) for r in data["amendments"]])

        print(f"Inserting {len(data['structural_divisions'])} structural divisions...")
        session.bulk_insert_mappings(
            StructuralDivision, [_map_division(r) for r in data["structural_divisions"]]
        )
        session.commit()

        print(f"Inserting {len(data['provisions'])} provisions in batches...")
        batch_size = 2000
        prov_rows = [_map_provision(r) for r in data["provisions"]]
        for i in range(0, len(prov_rows), batch_size):
            batch = prov_rows[i : i + batch_size]
            session.bulk_insert_mappings(Provision, batch)
            session.commit()
            print(f"  -> Inserted {i + len(batch)} / {len(prov_rows)}")

        print("Database seeding complete.")
    except Exception as e:
        session.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database(reset=True)
