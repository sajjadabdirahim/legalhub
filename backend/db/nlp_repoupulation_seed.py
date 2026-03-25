import json
import os
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv()

def seed_database():
    conn = None
    cur = None
    try:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL is not set in your .env file")
            
        conn = psycopg2.connect(db_url, sslmode="require")
        cur = conn.cursor()

        script_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(script_dir, "../../ml_pipeline/data/processed/relational_database_seed.json")
        json_path = os.path.normpath(json_path)

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Seed Statutes
        print(f"Inserting {len(data.get('statutes', []))} statutes.")
        statute_query = """
            INSERT INTO statutes (statute_id, title, statute_type, cap_number, frbr_uri, latest_version_date)
            VALUES (%(statute_id)s, %(title)s, %(statute_type)s, %(cap_number)s, %(frbr_uri)s, %(latest_version_date)s)
            ON CONFLICT (statute_id) DO NOTHING;
        """
        execute_batch(cur, statute_query, data.get('statutes', []), page_size=100)
        conn.commit() 
        print("Statutes committed.")

        # Seed Amendments
        print(f"Inserting {len(data.get('amendments', []))} amendments.")
        amendment_query = """
            INSERT INTO amendments (amendment_id, statute_id, amending_law_title, amendment_date)
            VALUES (%(amendment_id)s, %(statute_id)s, %(amending_law_title)s, %(amendment_date)s)
            ON CONFLICT (amendment_id) DO NOTHING;
        """
        execute_batch(cur, amendment_query, data.get('amendments', []), page_size=100)
        conn.commit() 
        print("Amendments committed.")

        # Seed Structural Divisions
        print(f"Inserting {len(data.get('structural_divisions', []))} structural divisions.")
        division_query = """
            INSERT INTO structural_divisions (division_id, statute_id, parent_division_id, division_type, division_number, heading)
            VALUES (%(division_id)s, %(statute_id)s, %(parent_division_id)s, %(division_type)s, %(division_number)s, %(heading)s)
            ON CONFLICT (division_id) DO NOTHING;
        """
        execute_batch(cur, division_query, data.get('structural_divisions', []), page_size=100)
        conn.commit()
        print("Structural Divisions committed.")

        # Seed Provisions
        print(f"Inserting {len(data.get('provisions', []))} provisions.")
        provision_query = """
            INSERT INTO provisions (provision_id, division_id, provision_number, heading, akn_eid, clean_text, status)
            VALUES (%(provision_id)s, %(division_id)s, %(provision_number)s, %(heading)s, %(akn_eid)s, %(clean_text)s, %(status)s)
            ON CONFLICT (provision_id) DO NOTHING;
        """
        execute_batch(cur, provision_query, data.get('provisions', []), page_size=100)
        conn.commit() 
        print("Provisions committed.")

        print("Database successfully seeded with legal texts")

    except Exception as e:
        if conn and conn.closed == 0:
            print("Rolling back partial transaction.")
            conn.rollback()
    finally:
        if cur and conn and conn.closed == 0:
            cur.close()
        if conn and conn.closed == 0:
            conn.close()
            print("Database connection safely closed.")

if __name__ == "__main__":
    seed_database()