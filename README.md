# Vision

## Sentinel-2 Orbit + Imagery Viewer
A 3D web app showing Sentinel-2A's real-time/historical orbit on a CesiumJS globe, with markers along the trajectory indicating available satellite imagery. Click a marker → thumbnail in side panel → expand to drape imagery on the globe. Scoped to one satellite, one fixed geographic region, last 30 days, running locally via Docker Compose.

## Progress

### Phase 1 — Scaffolding ✅
- React + Vite frontend with CesiumJS globe (OSM tiles, no Ion token required)
- Python FastAPI backend with health endpoint and CORS
- Docker Compose orchestration (hot-reload for both services)

### Phase 2 — Orbit Engine ✅
- TLE fetcher pulling live data from CelesTrak (24h cache)
- SGP4 orbit propagation (ECEF → geodetic conversion)
- `GET /api/orbit` endpoint returning timestamped lat/lon/alt positions
- Frontend orbit visualisation: cyan polyline arc + animated satellite marker
- Cesium Clock/Timeline wired to orbit window (60× playback)

### Phase 3 — Acquisition Index ✅
- STAC service querying Microsoft Planetary Computer for Sentinel-2 L2A imagery (30-min cache)
- SGP4 propagation of satellite position at each acquisition's datetime
- `GET /api/acquisitions` endpoint returning items with position, cloud cover, thumbnail URL, and footprint
- Frontend red "!" markers rendered at satellite position for each acquisition
- Acquisition count badge and click-to-inspect info box on markers

### Phase 4 — Image Visualisation 🔲