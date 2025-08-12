"""
Migrate tickets from SQL (local DB) to Firebase Realtime Database.

Usage:
  - Ensure environment variables are set for Firebase Admin:
      FIREBASE_PROJECT_ID, and either FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_BASE64
      (optional) FIREBASE_DATABASE_URL (defaults to https://<project>-default-rtdb.firebaseio.com)
  - Activate backend venv, then run:
      python -m utils.migrate_sql_to_rtdb

Notes:
  - Writes under /tickets/<id>
  - Maps media_url -> file_url (RTDB rules use file_url)
  - Adds owner_uid if not present (left as null by default)
  - Does not delete or modify SQL data
"""
from __future__ import annotations

import os
from datetime import datetime

from sqlalchemy import select

# Ensure project imports
import sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.append(ROOT)

from db.session import get_session  # type: ignore
from db.models import Ticket  # type: ignore
from db.firebase import get_rtdb_ref, get_rtdb_url  # type: ignore


def to_primitive(v):
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def migrate(batch_size: int = 200):
    db = get_session()
    try:
    total = db.query(Ticket).count()
    print(f"Found {total} SQL tickets to migrate (batch_size={batch_size})", flush=True)
    rtdb_url = get_rtdb_url()
    print(f"Using RTDB: {rtdb_url or '(default app databaseURL)'}", flush=True)
    offset = 0
    moved = 0
    ref = get_rtdb_ref("/tickets")
        while True:
            rows = db.execute(select(Ticket).order_by(Ticket.created_at.desc()).offset(offset).limit(batch_size)).scalars().all()
            if not rows:
                break
            updates = {}
            for t in rows:
                data = {
                    "id": t.id,
                    "iclass": t.iclass,
                    "severity": t.severity,
                    "lat": t.lat,
                    "lng": t.lng,
                    "address": t.address,
                    "status": t.status,
                    "contact": t.contact,
                    # RTDB uses file_url in rules; map from media_url
                    "file_url": t.media_url,
                    "authority": t.authority,
                    "authority_ticket_id": t.authority_ticket_id,
                    # Timestamps as ISO strings
                    "created_at": to_primitive(t.created_at),
                    "updated_at": to_primitive(t.updated_at),
                }
                # Preserve owner_uid if you populate it elsewhere; keep null otherwise
                # You can backfill owner assignments later from your auth system
                if getattr(t, "owner_uid", None):
                    data["owner_uid"] = getattr(t, "owner_uid")
                updates[t.id] = data
            try:
                ref.update(updates)
            except Exception as e:
                print(f"Batch update failed, attempting individual writes: {e}", flush=True)
                # Fallback to per-item set to surface which one fails
                for tid, data in updates.items():
                    try:
                        ref.child(tid).set(data)
                    except Exception as e2:
                        print(f"Failed to write {tid}: {e2}", flush=True)
            moved += len(rows)
            offset += batch_size
            print(f"Migrated {moved}/{total}...", flush=True)
        print("Done.", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
