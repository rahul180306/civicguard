import os
import sys
# Ensure backend root is on sys.path for `from db...` imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.session import get_session, engine
from db.models import Ticket
from datetime import datetime, timedelta
import uuid
import shutil
from sqlalchemy import text

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MEDIA_DIR = os.path.abspath(os.path.join(BASE_DIR, 'media'))
os.makedirs(MEDIA_DIR, exist_ok=True)

def main():
    # Ensure media_url column exists (Postgres/SQLite tolerant)
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS media_url TEXT"))
                conn.commit()
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE tickets ADD COLUMN media_url TEXT"))
                    conn.commit()
                except Exception:
                    pass
    except Exception:
        pass
    # Copy sample image into media
    sample_src = os.path.abspath(os.path.join(BASE_DIR, '..', 'sample.jpg'))
    if not os.path.exists(sample_src):
        raise FileNotFoundError(f"Sample not found: {sample_src}")
    key = f"{uuid.uuid4()}.jpg"
    dst = os.path.join(MEDIA_DIR, key)
    shutil.copyfile(sample_src, dst)

    # Insert ticket
    sid = str(uuid.uuid4())
    now = datetime.utcnow()
    t = Ticket(
        id=sid,
        iclass='pothole',
        severity='medium',
        lat=13.0827,
        lng=80.2707,
        address='Near Chennai Central, TN',
        status='CREATED',
        contact='user@example.com',
        media_url=f'http://localhost:8000/media/{key}',
        created_at=now - timedelta(hours=1),
        updated_at=now - timedelta(minutes=30),
    )
    db = get_session()
    db.add(t)
    db.commit()
    print(sid)

if __name__ == '__main__':
    main()
