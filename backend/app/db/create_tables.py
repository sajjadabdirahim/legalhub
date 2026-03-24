"""
Create every table defined in app.db.models on DATABASE_URL (e.g. Neon Postgres).

Run from the backend directory:
  python -m app.db.create_tables
  python -m app.db.create_tables --reset   # drop all app tables first (deletes data)

Requires: pip install psycopg2-binary (see backend/requirements.txt)

If you see "incompatible types: uuid and character varying", an older schema (varchar IDs)
still exists. Use --reset once to replace it, or drop conflicting tables in the Neon SQL editor.
"""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Create LegalHub DB tables on DATABASE_URL.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop all tables defined in models first (DESTRUCTIVE: deletes all rows in those tables).",
    )
    args = parser.parse_args()

    import app.db.models  # noqa: F401 — register models on Base.metadata

    from app.db.models import Base
    from app.db.session import engine

    if args.reset:
        print("Dropping existing tables from metadata...")
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)
    print("Done: all tables are present on the database.")


if __name__ == "__main__":
    main()
