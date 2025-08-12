from fastapi.testclient import TestClient
from app.main import app
from PIL import Image
import io

client = TestClient(app)

def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_upload_rejects_non_image():
    r = client.post("/upload", files={"file": ("not.txt", b"hello", "text/plain")})
    assert r.status_code == 415


def test_upload_accepts_image_and_returns_metadata():
    # Create an in-memory JPEG
    img = Image.new("RGB", (8, 8), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    data = buf.getvalue()

    r = client.post("/upload", files={"file": ("test.jpg", data, "image/jpeg")})
    assert r.status_code == 200
    payload = r.json()
    assert payload["filename"] == "test.jpg"
    assert payload["content_type"].startswith("image/")
    assert payload["size"] == len(data)
    assert isinstance(payload["sha256"], str) and len(payload["sha256"]) == 64
