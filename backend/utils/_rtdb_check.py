from __future__ import annotations

import os
from datetime import datetime, timezone
from db.firebase import get_rtdb_ref, get_rtdb_url
import json


def _ensure_env_defaults():
    """Best-effort: ensure required Firebase env vars are present for local checks.
    Falls back to the service account path you provided and civicguard-db project.
    """
    # Credentials JSON path
    if not os.getenv("FIREBASE_CREDENTIALS_JSON"):
        default_sa = r"C:\\firebase\\civicguard-db-firebase-adminsdk-fbsvc-c8fd1b0561.json"
        if os.path.exists(default_sa):
            os.environ["FIREBASE_CREDENTIALS_JSON"] = default_sa
    # Project ID
    if not os.getenv("FIREBASE_PROJECT_ID"):
        os.environ["FIREBASE_PROJECT_ID"] = "civicguard-db"
    # Database URL
    if not os.getenv("FIREBASE_DATABASE_URL") and os.getenv("FIREBASE_PROJECT_ID"):
        pid = os.getenv("FIREBASE_PROJECT_ID")
        os.environ["FIREBASE_DATABASE_URL"] = f"https://{pid}-default-rtdb.firebaseio.com"

def main():
    _ensure_env_defaults()
    url = get_rtdb_url()
    print("RTDB URL:", url or "(default app databaseURL)")
    cred_path = os.getenv("FIREBASE_CREDENTIALS_JSON")
    print("Using creds:", cred_path or os.getenv("FIREBASE_CREDENTIALS_BASE64", "<ADC>"))
    if cred_path and os.path.exists(cred_path):
        try:
            with open(cred_path, 'r', encoding='utf-8') as f:
                sa = json.load(f)
            print("Service account project_id:", sa.get("project_id"))
            print("Service account client_email:", sa.get("client_email"))
        except Exception as e:
            print("Could not read service account JSON:", e)
    # Write a health marker
    health = get_rtdb_ref('/__health')
    health.update({
        'lastWrite': datetime.now(timezone.utc).isoformat()
    })
    print("Health write OK")

    # Count tickets
    tickets = get_rtdb_ref('/tickets').get()
    count = 0 if tickets is None else len(tickets)
    print("Tickets count:", count)

if __name__ == '__main__':
    main()
