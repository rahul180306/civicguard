import os
import json
import base64
from functools import lru_cache
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore, db as rtdb


def _load_credentials() -> credentials.Certificate:
    path = os.getenv("FIREBASE_CREDENTIALS_JSON")
    blob_b64 = os.getenv("FIREBASE_CREDENTIALS_BASE64")
    if blob_b64:
        data = json.loads(base64.b64decode(blob_b64).decode("utf-8"))
        return credentials.Certificate(data)
    if path and os.path.exists(path):
        return credentials.Certificate(path)
    # Fall back to application default credentials
    return credentials.ApplicationDefault()


@lru_cache(maxsize=1)
def get_firestore_client():
    if not firebase_admin._apps:
        cred = _load_credentials()
        options = {}
        if os.getenv("FIREBASE_PROJECT_ID"):
            options["projectId"] = os.getenv("FIREBASE_PROJECT_ID")
        # Provide databaseURL if available so RTDB works without passing url per call
        db_url = os.getenv("FIREBASE_DATABASE_URL")
        if not db_url:
            pid = os.getenv("FIREBASE_PROJECT_ID")
            if pid:
                db_url = f"https://{pid}-default-rtdb.firebaseio.com"
        if db_url:
            options["databaseURL"] = db_url
        firebase_admin.initialize_app(cred, options or None)
    return firestore.client()


@lru_cache(maxsize=1)
def get_rtdb_url() -> str:
    url = os.getenv("FIREBASE_DATABASE_URL")
    if url:
        return url
    pid = os.getenv("FIREBASE_PROJECT_ID")
    if pid:
        return f"https://{pid}-default-rtdb.firebaseio.com"
    # As a last resort, return empty; callers should handle missing URL
    return ""


def get_rtdb_ref(path: str = "/"):
    """Return a Realtime Database reference at the given path.
    If the app isn't initialized yet, initialize it using available options.
    Works even if the app was initialized without databaseURL by passing url explicitly.
    """
    if not firebase_admin._apps:
        # Ensure app is initialized (may also set databaseURL if env available)
        _ = get_firestore_client()
    url = get_rtdb_url()
    return rtdb.reference(path, url=url or None)
