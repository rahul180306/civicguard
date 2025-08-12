import os

LABELS = ["pothole","garbage","streetlight","water_leak","illegal_parking","stray_animals"]


def _rule_based(filename_or_url: str):
    name = (filename_or_url or "").lower()
    for l in LABELS:
        if l.replace("_", "") in name:
            return l, "medium", 0.9
    return "unknown", "medium", 0.6


_YOLO = None
_YOLO_ENABLED = False

try:
    # Enable YOLO if ultralytics is available
    from ultralytics import YOLO  # type: ignore

    _model_path = os.getenv("YOLO_MODEL", "yolov8n.pt")
    _YOLO = YOLO(_model_path)
    _YOLO_ENABLED = True
except Exception:
    _YOLO = None
    _YOLO_ENABLED = False


COCO_TO_ISSUE = {
    "pothole": "pothole",
    "stop sign": "streetlight",
    "traffic light": "streetlight",
    "fire hydrant": "water_leak",
    "dog": "stray_animals",
    "cat": "stray_animals",
    "truck": "illegal_parking",
    "car": "illegal_parking",
    "trash bin": "garbage",
}


def _map_to_issue(cls_name: str):
    name = (cls_name or "").lower().strip()
    return COCO_TO_ISSUE.get(name, "unknown")


def classify(local_file_or_url: str):
    """
    Classify an image path or local media URL.
    Uses YOLO if available; otherwise falls back to rule-based.
    Returns: (issue_label, severity, confidence)
    """
    if not _YOLO_ENABLED:
        return _rule_based(local_file_or_url)

    # Convert local media URL to path if needed
    path = local_file_or_url
    if isinstance(path, str) and path.startswith("http://localhost:8000/media/"):
        path = "media/" + path.rsplit("/", 1)[-1]

    try:
        res = _YOLO.predict(path, conf=0.25, verbose=False)
        if not res or not getattr(res[0], "boxes", None) or len(res[0].boxes.cls) == 0:
            return _rule_based(local_file_or_url)

        cls_idx = int(res[0].boxes.cls[0].item())
        cls_name = res[0].names.get(cls_idx, "")
        conf = float(res[0].boxes.conf[0].item())

        issue = _map_to_issue(cls_name)
        severity = "high" if conf >= 0.6 else "medium"
        return issue, severity, conf
    except Exception:
        # On any YOLO error, fallback
        return _rule_based(local_file_or_url)
