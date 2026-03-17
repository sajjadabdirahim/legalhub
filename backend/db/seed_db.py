import os
import json
from sqlalchemy import create_engine, Column, String, Date, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(f"CRITICAL ERROR: DATABASE_URL is missing or .env file not found at {env_path}")

# Initialize SQLAlchemy
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ERD SQLAlchemy Models

class Statute(Base):
    __tablename__ = 'statutes'
    statute_id = Column(String(36), primary_key=True)
    title = Column(String(255), nullable=False)
    statute_type = Column(String(50))
    cap_number = Column(String(50))
    frbr_uri = Column(String(255))
    latest_version_date = Column(String(50))

class Amendment(Base):
    __tablename__ = 'amendments'
    amendment_id = Column(String(36), primary_key=True)
    statute_id = Column(String(36), ForeignKey('statutes.statute_id'))
    amending_law_title = Column(String(255))
    amendment_date = Column(String(50))

class StructuralDivision(Base):
    __tablename__ = 'structural_divisions'
    division_id = Column(String(36), primary_key=True)
    statute_id = Column(String(36), ForeignKey('statutes.statute_id'))
    parent_division_id = Column(String(36), nullable=True)
    division_type = Column(String(50))
    division_number = Column(String(50))
    heading = Column(Text)

class Provision(Base):
    __tablename__ = 'provisions'
    provision_id = Column(String(36), primary_key=True)
    division_id = Column(String(36), ForeignKey('structural_divisions.division_id'))
    latent_theme_id = Column(String(36), nullable=True) # For Horris's Topics later
    provision_type = Column(String(50))
    provision_number = Column(String(50))
    heading = Column(Text)
    akn_eid = Column(String(100))
    clean_text = Column(Text, nullable=False)
    status = Column(String(50))


# Execution Logic

def seed_database():
    print("Creating tables in Neon.tech PostgreSQL...")
    Base.metadata.drop_all(bind=engine) # Resets DB for a clean slate
    Base.metadata.create_all(bind=engine)
    
    session = SessionLocal()
    json_path = os.path.join(os.path.dirname(__file__), "../../ml_pipeline/data/processed/relational_database_seed.json")
    
    print("Loading Golden Dataset...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    try:
        # Insert Statutes
        print(f"Inserting {len(data['statutes'])} Statutes...")
        session.bulk_insert_mappings(Statute, data['statutes'])
        
        # Insert Amendments
        print(f"Inserting {len(data['amendments'])} Amendments...")
        session.bulk_insert_mappings(Amendment, data['amendments'])
        
        # Insert Divisions
        print(f"Inserting {len(data['structural_divisions'])} Divisions...")
        session.bulk_insert_mappings(StructuralDivision, data['structural_divisions'])
        session.commit() # Commit parents before adding children
        
        # Insert Provisions (Batching to prevent memory overload on 19k rows)
        print(f"Inserting {len(data['provisions'])} Provisions in batches...")
        batch_size = 2000
        for i in range(0, len(data['provisions']), batch_size):
            batch = data['provisions'][i:i+batch_size]
            session.bulk_insert_mappings(Provision, batch)
            session.commit()
            print(f"  -> Inserted {i + len(batch)} / {len(data['provisions'])}")

        print("Database Seeding Complete! PostgreSQL is fully populated.")
    
    except Exception as e:
        session.rollback()
        print(f"Error seeding database: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    seed_database()