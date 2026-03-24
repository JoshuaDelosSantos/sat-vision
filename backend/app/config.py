NORAD_ID = 40697  # Sentinel-2A
TLE_URL = f"https://celestrak.org/NORAD/elements/gp.php?CATNR={NORAD_ID}&FORMAT=TLE"
TLE_CACHE_TTL_SECONDS = 86400  # 24 hours

STAC_API_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
STAC_COLLECTION = "sentinel-2-l2a"
STAC_CACHE_TTL_SECONDS = 1800  # 30 minutes

# SE Australia bounding box [west, south, east, north]
REGION_BBOX = [140.0, -40.0, 155.0, -28.0]

# Orbit propagation defaults
DEFAULT_WINDOW_MINUTES = 100
DEFAULT_STEP_SECONDS = 30
