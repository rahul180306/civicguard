from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from typing import Optional
from PIL import Image
import exifread
import io
import hashlib
import os
import logging
import uuid
import shutil
from dotenv import load_dotenv
load_dotenv()
from db.repository import TicketRepo
from db.models import Ticket, Base  # kept for SQL mode aspects like ensure
from db.session import engine  # still used for SQL ensure
from sqlalchemy import inspect, text
from agents.storage import save_upload
from agents.vision import classify
from agents.geo import reverse_geocode, exif_gps_from_file
from agents.geo import _reverse_geocode_mapbox, _reverse_geocode_nominatim  # test-only provider introspection
from workers.queue import file_queue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("civicguard")

app = FastAPI(title="CivicGuard API")

"""CORS configuration
In development we allow localhost origins. In production, define ALLOWED_ORIGINS
as a comma-separated list (e.g. ALLOWED_ORIGINS=https://civicguard-xxx.vercel.app)
so we do not rely on a wildcard.
"""

default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    origins = [o.strip() for o in env_origins.split(",") if o.strip()]
else:
    # Fallback to dev defaults only (no '*')
    origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS origins configured: %s", origins)

# Serve uploaded files (dev)
MEDIA_DIR = os.path.join(os.path.dirname(__file__), "..", "media")
MEDIA_DIR = os.path.abspath(MEDIA_DIR)
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


# Ensure DB schema minimal updates (only relevant in SQL mode)
def _ensure_media_url_column():
    try:
        insp = inspect(engine)
        cols = [c['name'] for c in insp.get_columns('tickets')]
        if 'media_url' not in cols:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS media_url TEXT"))
                    conn.commit()
                except Exception:
                    conn.execute(text("ALTER TABLE tickets ADD COLUMN media_url TEXT"))
                    conn.commit()
    except Exception:
        pass

try:
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
except Exception:
    pass
_ensure_media_url_column()


@app.get("/api/stats")
async def stats():
    # Implement using list/get in repo for compatibility across backends
    # Count open
    open_items = TicketRepo.list(limit=200).get("items", [])
    open_count = sum(1 for t in open_items if t.get("status") in ("CREATED", "FILING"))

    # Filed today
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    filed_today = 0
    durations = []
    for t in open_items:
        if t.get("status") == "FILED":
            created_at = t.get("created_at")
            updated_at = t.get("updated_at")
            try:
                # Firestore returns datetime; SQL returns datetime; if strings, try parse
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if isinstance(updated_at, str):
                    updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            except Exception:
                created_at = updated_at = None
            if created_at and created_at.date() == today:
                filed_today += 1
            if created_at and updated_at and updated_at >= created_at:
                durations.append((updated_at - created_at).total_seconds())

    avg_secs = int(sum(durations) / len(durations)) if durations else 0
    m, s = divmod(avg_secs, 60)
    avg_str = f"{m}m {s:02d}s" if avg_secs else "0m 00s"
    return {"open": open_count, "filed_today": filed_today, "avg_time_to_file": avg_str}


@app.get("/")
async def root():
    return {"service": "civicguard", "status": "ok"}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/test-geocode")
async def test_geocode(lat: float, lng: float):
    """Quick endpoint to test reverse geocoding and surface errors in logs.
    Also returns which provider responded (mapbox|nominatim|unknown).
    """
    provider = "unknown"
    addr = _reverse_geocode_mapbox(lat, lng)
    if addr:
        provider = "mapbox"
    else:
        addr = _reverse_geocode_nominatim(lat, lng)
        if addr:
            provider = "nominatim"
    if not addr:
        addr = "Unknown"
    return {"ok": addr not in (None, "Unknown"), "provider": provider, "address": addr}


def _dms_to_deg(dms, ref: Optional[str] = None) -> Optional[float]:
    try:
        d = float(dms.values[0].num) / float(dms.values[0].den)
        m = float(dms.values[1].num) / float(dms.values[1].den)
        s = float(dms.values[2].num) / float(dms.values[2].den)
        deg = d + (m / 60.0) + (s / 3600.0)
        if ref in ("S", "W"):
            deg = -deg
        return deg
    except Exception:
        return None


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Unsupported media type. Please upload an image.")

    data = await file.read()
    size = len(data)
    max_size = 10 * 1024 * 1024  # 10MB
    if size > max_size:
        raise HTTPException(status_code=413, detail="File too large (max 10MB).")

    # Validate image can be opened
    try:
        Image.open(io.BytesIO(data)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    # Hash for idempotency
    sha256 = hashlib.sha256(data).hexdigest()

    # EXIF GPS (best-effort)
    gps = None
    try:
        tags = exifread.process_file(io.BytesIO(data), details=False)
        lat = tags.get("GPS GPSLatitude")
        lat_ref = tags.get("GPS GPSLatitudeRef")
        lon = tags.get("GPS GPSLongitude")
        lon_ref = tags.get("GPS GPSLongitudeRef")
        lat_deg = _dms_to_deg(lat, getattr(lat_ref, "values", [None])[0] if lat_ref else None) if lat else None
        lon_deg = _dms_to_deg(lon, getattr(lon_ref, "values", [None])[0] if lon_ref else None) if lon else None
        if lat_deg is not None and lon_deg is not None:
            gps = {"lat": lat_deg, "lon": lon_deg}
    except Exception:
        gps = None

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": size,
        "sha256": sha256,
        "gps": gps,
    }


@app.post("/api/intake")
async def intake(
    image: UploadFile = File(...),
    note: str | None = Form(None),
    lat: float | None = Form(None),
    lng: float | None = Form(None),
    contact: str | None = Form(None),
):
    try:
        # Save file (MinIO or local) and build URL
        try:
            key, file_url = save_upload(image)
        except Exception:
            logger.exception("save_upload failed")
            raise HTTPException(status_code=500, detail="Upload failed")

        local_media_path = os.path.join(os.path.dirname(__file__), "..", "media", key)

        # Lightweight classification (filename-based)
        iclass, severity, conf = classify(image.filename or "")

        # Autofill coordinates from EXIF if not provided
        if lat is None or lng is None:
            try:
                gps = exif_gps_from_file(local_media_path)
                if gps:
                    lat, lng = gps
            except Exception:
                logger.info("EXIF GPS read failed", exc_info=True)

        # Reverse geocode (best-effort)
        try:
            address = reverse_geocode(lat, lng) if (lat is not None and lng is not None) else "Unknown"
        except Exception:
            logger.info("reverse_geocode failed", exc_info=True)
            address = "Unknown"

        tid = str(uuid.uuid4())
        TicketRepo.create({
            "id": tid,
            "iclass": iclass,
            "severity": severity,
            "lat": lat,
            "lng": lng,
            "address": address,
            "status": "CREATED",
            "contact": contact,
            "media_url": file_url,
        })

        try:
            file_queue.enqueue("workers.jobs.file_to_authority", tid, file_url, iclass, address, contact)
        except Exception:
            logger.info("Queue enqueue failed (non-fatal)", exc_info=True)

        return {
            "id": tid,
            "file_url": file_url,
            "class": iclass,
            "severity": severity,
            "confidence": round(conf, 3),
            "lat": lat,
            "lng": lng,
            "address": address,
            "note": note,
            "contact": contact,
            "status": "CREATED",
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("intake failed")
        raise HTTPException(status_code=500, detail="Intake failed")


@app.get("/api/tickets/{tid}")
async def get_ticket(tid: str):
    t = TicketRepo.get(tid)
    if not t:
        return {"error": "not_found"}
    return t


@app.get("/api/tickets")
async def list_tickets(limit: int = 50, offset: int = 0, status: Optional[str] = None, iclass: Optional[str] = None):
    return TicketRepo.list(limit=limit, offset=offset, status=status, iclass=iclass)


@app.get("/debug/cors")
async def debug_cors():
    """Temporary diagnostic endpoint to view effective CORS settings in runtime.
    Remove this in production once CORS issue is resolved.
    """
    return {
        "configured_origins": origins,
        "env_raw": os.getenv("ALLOWED_ORIGINS"),
        "note": "If your frontend origin is not exactly in configured_origins (string match), CORS will fail."
    }


@app.api_route("/admin/fix-media-urls", methods=["GET", "POST"]) 
async def fix_media_urls(dry_run: bool = True):
    """Replace media_url starting with http://localhost:8000 with BACKEND_PUBLIC_URL.
    dry_run=true just reports counts; dry_run=false commits changes.
    TEMP maintenance endpoint; remove after cleanup.
    """
    backend_base = os.getenv("BACKEND_PUBLIC_URL") or "https://civicguard-backend.onrender.com"
    old_prefixes = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://localhost:8000",
        "https://127.0.0.1:8000",
    ]
    from db.session import get_session
    from db.models import Ticket
    db = get_session()
    updated = 0
    cleared = 0
    cleared_media_dir = 0
    total = 0
    try:
        rows = db.query(Ticket).all()
        total = len(rows)
        for r in rows:
            mu = r.media_url
            if not mu:
                continue
            # Fix localhost/127 prefix
            for op in old_prefixes:
                if mu.startswith(op):
                    new_url = mu.replace(op, backend_base, 1)
                    if not dry_run:
                        r.media_url = new_url
                    updated += 1
                    mu = new_url
                    break
            # Clear URLs that point only to /media or /media/
            try:
                from urllib.parse import urlparse
                parsed = urlparse(mu)
                path = (parsed.path or "").rstrip("/")
                if path.endswith("/media"):
                    if not dry_run:
                        r.media_url = None
                    cleared_media_dir += 1
                    continue
            except Exception:
                pass
            # Clear invalid/ellipsis URLs so frontend doesn't try to fetch …
            trimmed = mu.strip()
            if trimmed in ("…", "...") or not (trimmed.startswith("http://") or trimmed.startswith("https://")):
                if not dry_run:
                    r.media_url = None
                cleared += 1
        if not dry_run and (updated or cleared):
            db.commit()
        return {
            "total": total,
            "would_update": updated,
            "updated": 0 if dry_run else updated,
            "cleared_invalid": cleared if dry_run else cleared,
            "cleared_media_dir": cleared_media_dir if dry_run else cleared_media_dir,
            "backend_base": backend_base,
            "dry_run": dry_run,
        }
    finally:
        db.close()
