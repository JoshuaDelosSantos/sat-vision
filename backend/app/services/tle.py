import time
import httpx
from app.config import TLE_URL, TLE_CACHE_TTL_SECONDS

_cache: dict[str, tuple[float, tuple[str, str]]] = {}


def fetch_tle() -> tuple[str, str]:
    """Fetch the latest TLE for Sentinel-2A from CelesTrak.

    Returns (line1, line2) with 24h in-memory caching.
    """
    now = time.time()
    cached = _cache.get("tle")
    if cached and (now - cached[0]) < TLE_CACHE_TTL_SECONDS:
        return cached[1]

    resp = httpx.get(TLE_URL, timeout=15.0)
    resp.raise_for_status()

    lines = [line.strip() for line in resp.text.strip().splitlines() if line.strip()]
    # CelesTrak returns: name\nline1\nline2
    if len(lines) >= 3:
        tle_lines = (lines[1], lines[2])
    elif len(lines) == 2:
        tle_lines = (lines[0], lines[1])
    else:
        raise ValueError(f"Unexpected TLE format: got {len(lines)} lines")

    _cache["tle"] = (now, tle_lines)
    return tle_lines
