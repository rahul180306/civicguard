import os
import uuid
import shutil
import io
from typing import Tuple

import boto3
from botocore.client import Config as BotoConfig

# MEDIA_DIR relative to backend/app.py's mount (/media)
MEDIA_DIR = os.path.join(os.path.dirname(__file__), "..", "media")
MEDIA_DIR = os.path.abspath(MEDIA_DIR)
os.makedirs(MEDIA_DIR, exist_ok=True)


def _minio_client():
    endpoint = os.getenv("MINIO_ENDPOINT")  # e.g., http://localhost:9000
    access_key = os.getenv("MINIO_ACCESS_KEY") or os.getenv("MINIO_ROOT_USER")
    secret_key = os.getenv("MINIO_SECRET_KEY") or os.getenv("MINIO_ROOT_PASSWORD")
    if not endpoint or not access_key or not secret_key:
        return None
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=os.getenv("MINIO_REGION", "us-east-1"),
        config=BotoConfig(signature_version="s3v4"),
    )


def save_upload(upload_file) -> Tuple[str, str]:
    """
    Save UploadFile.
    - If MINIO_* env is configured, upload to MinIO bucket and return public URL.
    - Otherwise, save locally under /media and return local URL.
    Returns: (key, public_url)
    """
    ext = os.path.splitext(getattr(upload_file, "filename", "") or "")[1] or ".jpg"
    key = f"{uuid.uuid4()}{ext}"

    # Try MinIO first
    s3 = _minio_client()
    bucket = os.getenv("MINIO_BUCKET", "uploads")
    public_base = os.getenv("MINIO_PUBLIC_URL", os.getenv("MINIO_ENDPOINT", "http://localhost:9000"))
    if s3:
        # Ensure stream at beginning
        try:
            upload_file.file.seek(0)
        except Exception:
            pass
        extra = {"ContentType": getattr(upload_file, "content_type", "application/octet-stream")}
        s3.upload_fileobj(upload_file.file, bucket, key, ExtraArgs=extra)
        # Assume bucket is anonymously readable per infra/minio-init
        url = f"{public_base.rstrip('/')}/{bucket}/{key}"
        return key, url

    # Fallback to local FS
    path = os.path.join(MEDIA_DIR, key)
    with open(path, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return key, f"http://localhost:8000/media/{key}"
