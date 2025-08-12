"""
One-time migration: copy tickets from SQL database to Firestore.

Prereqs:
- pip install -r backend/requirements.txt (includes firebase-admin)
- Set env:
  - USE_FIREBASE=true (to exercise repo paths if desired, not required for migration)
  - FIREBASE_PROJECT_ID, and either FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_BASE64

Run:
  python backend/utils/migrate_sql_to_firestore.py
"""
from __future__ import annotations
import os, sys
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.append(ROOT)

from db.session import get_session
from db.models import Ticket
from db.firebase import get_firestore_client


def main():
    sql = get_session()
    fb = get_firestore_client()
    try:
        rows = sql.query(Ticket).all()
        print(f"Migrating {len(rows)} tickets to Firestore...")
        batch = fb.batch()
        cnt = 0
        for r in rows:
            ref = fb.collection("tickets").document(r.id)
            data = r.as_dict()
            batch.set(ref, data)
            cnt += 1
            if cnt % 400 == 0:
                batch.commit()
                batch = fb.batch()
        if cnt % 400:
            batch.commit()
        print("Done.")
    finally:
        sql.close()


if __name__ == "__main__":
    main()
