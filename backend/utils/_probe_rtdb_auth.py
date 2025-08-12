from __future__ import annotations

import os
import json
from datetime import datetime, timezone

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request


def main():
    project_id = os.getenv("FIREBASE_PROJECT_ID", "civicguard-db")
    rtdb_url = os.getenv("FIREBASE_DATABASE_URL", f"https://{project_id}-default-rtdb.firebaseio.com")
    sa_path = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if not sa_path or not os.path.exists(sa_path):
        raise SystemExit(f"Missing or invalid FIREBASE_CREDENTIALS_JSON: {sa_path}")

    print("RTDB URL:", rtdb_url)
    print("Service account:", sa_path)

    scopes = [
        "https://www.googleapis.com/auth/firebase.database",
        "https://www.googleapis.com/auth/userinfo.email",
    ]
    creds = service_account.Credentials.from_service_account_file(sa_path, scopes=scopes)
    creds.refresh(Request())
    print("Access token acquired, expires at:", creds.expiry)

    # Try a PATCH to /__health/probeTokenWrite
    url = f"{rtdb_url}/__health/probeTokenWrite.json"
    payload = {"at": datetime.now(timezone.utc).isoformat(), "by": "_probe_rtdb_auth"}
    headers = {"Authorization": f"Bearer {creds.token}"}
    resp = requests.patch(url, json=payload, headers=headers)
    print("PATCH status:", resp.status_code)
    try:
        print("Response:", resp.json())
    except Exception:
        print("Response text:", resp.text[:500])


if __name__ == "__main__":
    main()
