import os, requests, exifread, time

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")

def _reverse_geocode_mapbox(lat: float | None, lng: float | None) -> str | None:
    """Reverse geocode with Mapbox. Includes simple retry/backoff and diagnostics.
    Returns place_name or None.
    """
    if not (MAPBOX_TOKEN and lat is not None and lng is not None):
        return None
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json"
    params = {"access_token": MAPBOX_TOKEN, "limit": 1}
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, timeout=10)
        except Exception as e:
            print(f"[Mapbox] request error on attempt {attempt+1}: {e}")
            # quick backoff for transient client-side errors
            time.sleep(0.8 * (attempt + 1))
            continue

        if r.status_code == 200:
            try:
                data = r.json()
                feats = data.get("features") or []
                return feats[0].get("place_name") if feats else None
            except Exception as e:
                print(f"[Mapbox] json parse error: {e}; body={r.text[:180]}")
                return None

        # helpful diagnostics
        print(f"[Mapbox] status={r.status_code} attempt={attempt+1} body={r.text[:180]}")
        if r.status_code in (429, 503):  # rate limit / service unavailable
            time.sleep(1.5 * (attempt + 1))
            continue
        if r.status_code in (401, 403):  # auth/restriction -> don't retry
            break
        # other errors: one quick retry
        time.sleep(0.8)
    return None

def _reverse_geocode_nominatim(lat: float | None, lng: float | None) -> str | None:
    """Reverse geocode via Nominatim (OSM). Includes UA for policy compliance."""
    if lat is None or lng is None:
        return None
    try:
        headers = {"User-Agent": os.getenv("NOMINATIM_UA", "CivicGuard/1.0 (contact@example.com)")}
        url = "https://nominatim.openstreetmap.org/reverse"
        r = requests.get(
            url,
            params={"format": "jsonv2", "lat": lat, "lon": lng, "zoom": 16},
            headers=headers,
            timeout=12,
        )
        if r.status_code == 200:
            try:
                data = r.json()
                return data.get("display_name") or None
            except Exception as e:
                print(f"[Nominatim] json parse error: {e}; body={r.text[:180]}")
                return None
        print(f"[Nominatim] status={r.status_code} body={r.text[:180]}")
    except Exception as e:
        print("[Nominatim] error:", e)
    return None

def reverse_geocode(lat: float | None, lng: float | None) -> str:
    if lat is None or lng is None:
        return "Unknown"
    place = _reverse_geocode_mapbox(lat, lng)
    if place:
        return place
    place = _reverse_geocode_nominatim(lat, lng)
    return place or "Unknown"


def _dms_to_deg(dms, ref):
    d = float(dms[0].num) / dms[0].den
    m = float(dms[1].num) / dms[1].den
    s = float(dms[2].num) / dms[2].den
    deg = d + (m / 60.0) + (s / 3600.0)
    if ref in ["S", "W"]:
        deg = -deg
    return deg


def exif_gps_from_file(local_path: str):
    try:
        with open(local_path, "rb") as f:
            tags = exifread.process_file(f, details=False)
        lat = tags.get("GPS GPSLatitude")
        lat_ref = tags.get("GPS GPSLatitudeRef")
        lng = tags.get("GPS GPSLongitude")
        lng_ref = tags.get("GPS GPSLongitudeRef")
        if lat and lng and lat_ref and lng_ref:
            return (
                _dms_to_deg(lat.values, lat_ref.values),
                _dms_to_deg(lng.values, lng_ref.values),
            )
    except Exception:
        pass
    return None
