"""SGP4 orbit propagator — converts TLE data into lat/lon/alt position arrays."""

import math
from datetime import datetime, timedelta, timezone

from sgp4.api import Satrec, WGS84
from sgp4 import exporter

from app.services.tle import fetch_tle


def _ecef_to_lla(x_km: float, y_km: float, z_km: float) -> tuple[float, float, float]:
    """Convert ECEF (km) to geodetic lat (deg), lon (deg), alt (km) using iterative method."""
    a = 6378.137  # WGS84 semi-major axis (km)
    f = 1 / 298.257223563
    b = a * (1 - f)
    e2 = 1 - (b * b) / (a * a)

    lon = math.atan2(y_km, x_km)
    p = math.sqrt(x_km * x_km + y_km * y_km)
    lat = math.atan2(z_km, p * (1 - e2))

    for _ in range(10):
        sin_lat = math.sin(lat)
        N = a / math.sqrt(1 - e2 * sin_lat * sin_lat)
        lat = math.atan2(z_km + e2 * N * sin_lat, p)

    sin_lat = math.sin(lat)
    N = a / math.sqrt(1 - e2 * sin_lat * sin_lat)
    alt = p / math.cos(lat) - N

    return math.degrees(lat), math.degrees(lon), alt


def propagate_orbit(
    center_time: datetime,
    window_minutes: int = 100,
    step_seconds: int = 30,
) -> list[dict]:
    """Propagate Sentinel-2A orbit around center_time.

    Returns list of {epoch_ms, lat_deg, lon_deg, alt_km}.
    """
    line1, line2 = fetch_tle()
    sat = Satrec.twoline2rv(line1, line2, WGS84)

    start = center_time - timedelta(minutes=window_minutes / 2)
    positions = []
    total_steps = int((window_minutes * 60) / step_seconds) + 1

    for i in range(total_steps):
        t = start + timedelta(seconds=i * step_seconds)
        jd, fr = _datetime_to_jd(t)
        e, r, v = sat.sgp4(jd, fr)
        if e != 0:
            continue
        lat, lon, alt = _ecef_to_lla(r[0], r[1], r[2])
        positions.append({
            "epoch_ms": int(t.timestamp() * 1000),
            "lat_deg": round(lat, 6),
            "lon_deg": round(lon, 6),
            "alt_km": round(alt, 2),
        })

    return positions


def propagate_at(t: datetime) -> dict:
    """Propagate to a single point in time. Returns {lat_deg, lon_deg, alt_km}."""
    line1, line2 = fetch_tle()
    sat = Satrec.twoline2rv(line1, line2, WGS84)
    jd, fr = _datetime_to_jd(t)
    e, r, v = sat.sgp4(jd, fr)
    if e != 0:
        raise ValueError(f"SGP4 propagation error code {e}")
    lat, lon, alt = _ecef_to_lla(r[0], r[1], r[2])
    return {"lat_deg": round(lat, 6), "lon_deg": round(lon, 6), "alt_km": round(alt, 2)}


def _datetime_to_jd(dt: datetime) -> tuple[float, float]:
    """Convert a datetime to Julian Date (jd, fraction) for sgp4."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    # Julian Date of Unix epoch (1970-01-01T00:00:00Z)
    jd_unix_epoch = 2440587.5
    timestamp = dt.timestamp()
    jd_full = jd_unix_epoch + timestamp / 86400.0
    jd = int(jd_full - 0.5) + 0.5  # truncate to half-day
    fr = jd_full - jd
    return jd, fr
