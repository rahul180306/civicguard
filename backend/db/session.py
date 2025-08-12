import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure .env is loaded before reading DB_URL
load_dotenv()

DB_URL = os.getenv(
    "DB_URL",
    # Temporary local default: SQLite file DB
    "sqlite:///d:/civicguard/backend/dev.db",
)

# Enable pre-ping to avoid stale connections; keep defaults for drivers
engine = create_engine(DB_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def get_session():
    return SessionLocal()
