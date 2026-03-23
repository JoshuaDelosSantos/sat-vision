# Plan: Sat-Vision — Sentinel-2 Orbit + Imagery Viewer

## TL;DR

A 3D web app showing Sentinel-2A's real-time/historical orbit on a CesiumJS globe, with markers along the trajectory indicating available satellite imagery. Click a marker → thumbnail in side panel → expand to drape imagery on the globe. Scoped to one satellite, one fixed geographic region, last 30 days, running locally via Docker Compose.

## Decisions & Constraints

- **Satellite**: Sentinel-2A (NORAD 40697) — best public optical EO data, massive STAC catalog
- **Data source**: Microsoft Planetary Computer STAC API (`sentinel-2-l2a` collection)
- **TLE source**: CelesTrak (no auth required, free, updated daily)
- **Region**: Fixed bounding box (SE Australia: `[140, -40, 155, -28]` — good mix of land/coast, frequent clear skies). Configurable in backend config.
- **Time window**: Last 30 days from current date
- **Orbit display**: Current orbit arc only (~100 min), shifts as timeline scrubs
- **Image UX**: Click "!" → thumbnail in side panel → click "View on Globe" to drape
- **Stack**: React + Resium (frontend), Python FastAPI (backend), Docker Compose (local dev)
- **Goal**: Learning project — favour clarity over optimisation

## Architecture

### Frontend (React + Resium + Vite)

- `<Viewer>` with Cesium globe, timeline, animation controls
- Satellite entity animated via `SampledPositionProperty` (Cesium's built-in interpolation along time-tagged positions)
- Orbit path as `Polyline` entity from backend-provided positions
- Acquisition markers as `Billboard` entities with "!" icon, placed at satellite position at acquisition time
- Side panel (React component) for thumbnail + metadata + "drape on globe" button
- `ImageryLayer` added dynamically when user drapes an image (sourced from Planetary Computer's tile rendering API)

### Backend (Python FastAPI)

- **`GET /api/orbit`** — Fetches TLE from CelesTrak, propagates via `sgp4` library, returns position array `[{epoch_ms, lat_deg, lon_deg, alt_km}, ...]` for the current ~100-min orbit around a given time
- **`GET /api/acquisitions`** — Queries Planetary Computer STAC for `sentinel-2-l2a` items within the fixed bbox + date range. For each item, propagates satellite position at item's `datetime`. Returns `[{datetime, lat, lon, stac_item_id, thumbnail_url, footprint_geojson, cloud_cover_pct}, ...]`
- **`GET /api/imagery/{item_id}/tile-url`** — Returns a Planetary Computer tile URL (XYZ template) for a given STAC item, suitable for Cesium `UrlTemplateImageryProvider`. Uses `planetary-computer` Python package to sign asset URLs.
- TLE cached in-memory (refreshed daily). STAC results cached per bbox+date range (30-min TTL).

### Data Flow

```
User scrubs timeline to time T
        │
        ▼
Frontend calls GET /api/orbit?time=T
        │
        ▼
Backend: fetch TLE (cached) → SGP4 propagate ±50min around T → return positions
        │
        ▼
Frontend renders orbit polyline + animated satellite at T
        │
        ▼
Frontend calls GET /api/acquisitions?start=T-15d&end=T+15d&bbox=...
        │
        ▼
Backend: STAC query (cached) → for each item, SGP4 at item.datetime → return index
        │
        ▼
Frontend renders "!" markers on trajectory at acquisition positions
        │
        ▼
User clicks "!" marker
        │
        ▼
Side panel shows thumbnail (direct URL from STAC item) + metadata
        │
        ▼
User clicks "View on Globe"
        │
        ▼
Frontend calls GET /api/imagery/{item_id}/tile-url → gets signed XYZ tile URL
        │
        ▼
Cesium adds ImageryLayer with UrlTemplateImageryProvider, clipped to footprint polygon
```

## Implementation Phases

### Phase 1 — Scaffolding

1. Init monorepo structure: `frontend/`, `backend/`, `docker-compose.yml`
2. Frontend: Vite + React + TypeScript + Resium. Verify `<Viewer>` renders a globe with default imagery
3. Backend: FastAPI + `pyproject.toml` (dependencies: `fastapi`, `uvicorn`, `sgp4`, `pystac-client`, `planetary-computer`, `httpx`). Health endpoint returning `{"status": "ok"}`
4. Docker Compose: frontend dev server (port 5173) + backend (port 8000), with hot-reload mounts
5. **Verify**: Globe loads in browser, backend health check responds

### Phase 2 — Orbit Engine

6. Backend: `services/tle.py` — fetch TLE for NORAD 40697 from CelesTrak, cache in memory with 24h TTL
7. Backend: `services/propagator.py` — given TLE + time range + step interval, return array of ECEF→LLA positions using `sgp4` library. Key function: `propagate_orbit(tle_lines, center_time, window_minutes, step_seconds) -> list[Position]`
8. Backend: `routers/orbit.py` — `GET /api/orbit?time={iso8601}&window_minutes=100&step_seconds=30` → returns position array
9. Frontend: `hooks/useOrbit.ts` — fetch orbit positions, convert to Cesium `SampledPositionProperty` with `Cartographic` positions
10. Frontend: `components/OrbitPath.tsx` — polyline entity from position samples
11. Frontend: `components/SatelliteEntity.tsx` — point/model entity with `position` set to the `SampledPositionProperty`, tracked by Cesium's clock
12. Wire Cesium `Clock` and `Timeline` widget — play/pause/speed controls, scrubbing re-fetches orbit
13. **Verify**: Satellite dot moves along visible orbit arc, timeline controls work, orbit shifts when scrubbing to different times

### Phase 3 — Acquisition Index *(depends on Phase 2)*

14. Backend: `services/stac.py` — query Planetary Computer STAC for `sentinel-2-l2a` collection with bbox + datetime range. Use `pystac-client` to search. Key function: `fetch_acquisitions(bbox, start_date, end_date) -> list[STACItem]`
15. Backend: for each STAC item, propagate satellite position at `item.datetime` using the propagator service (reuse step 7). Attach position to response.
16. Backend: `routers/imagery.py` — `GET /api/acquisitions?start={iso}&end={iso}&bbox={w,s,e,n}` → returns acquisition index (capped at 200 items, sorted by datetime)
17. Frontend: `hooks/useAcquisitions.ts` — fetch acquisition index on timeline range change (debounced 500ms)
18. Frontend: `components/AcquisitionMarkers.tsx` — render `Billboard` entities at each acquisition's satellite position, with "!" icon. Attach `stac_item_id` and metadata to entity for click handling.
19. **Verify**: "!" markers appear on trajectory at correct positions/times. Count matches expected Sentinel-2 revisit frequency for the region (~every 5 days).

### Phase 4 — Image Visualization *(depends on Phase 3)*

20. Frontend: `components/ImagePanel.tsx` — side panel (absolutely positioned, right side). On marker click, show: thumbnail image (from STAC `rendered_preview` or `thumbnail` asset URL), datetime, cloud cover %, footprint bbox, "View on Globe" button.
21. Backend: `GET /api/imagery/{item_id}/tile-url` — uses `planetary-computer` package to sign the item's tile rendering URL. Returns `{tile_url_template: "https://.../{z}/{x}/{y}.png", bbox: [...], attribution: "..."}`.
22. Frontend: "View on Globe" button — creates a `UrlTemplateImageryProvider` with the signed tile URL, adds it as a new `ImageryLayer` to the Viewer. Use `ImageryLayer.rectangle` to clip to the item's footprint.
23. Add UI to remove/toggle draped imagery layers (simple list in the panel).
24. Loading spinners: show loading state in panel while thumbnail loads, show globe loading indicator while tiles stream in.
25. **Verify**: Click "!" → panel shows correct thumbnail and metadata. Click "View on Globe" → imagery appears on globe at correct location. Multiple images can be draped and toggled.

## Relevant Files

### Root

- `docker-compose.yml` — frontend + backend services, volume mounts for hot reload
- `README.md` — update with setup instructions

### Frontend (`frontend/`)

- `Dockerfile` — Node 20, Vite dev server
- `package.json` — deps: `react`, `resium`, `cesium`, `@cesium/widgets`, `vite`, `vite-plugin-cesium`
- `src/App.tsx` — layout: Globe + ImagePanel
- `src/components/Globe.tsx` — Resium `<Viewer>` wrapper with timeline config
- `src/components/SatelliteEntity.tsx` — animated satellite point/model
- `src/components/OrbitPath.tsx` — trajectory polyline
- `src/components/AcquisitionMarkers.tsx` — "!" billboard markers
- `src/components/ImagePanel.tsx` — side panel for thumbnail + drape controls
- `src/hooks/useOrbit.ts` — orbit data fetching + Cesium property construction
- `src/hooks/useAcquisitions.ts` — acquisition index fetching
- `src/services/api.ts` — fetch wrapper for backend

### Backend (`backend/`)

- `Dockerfile` — Python 3.12, uvicorn
- `pyproject.toml` — deps: `fastapi`, `uvicorn`, `sgp4`, `pystac-client`, `planetary-computer`, `httpx`
- `app/main.py` — FastAPI app, CORS middleware, router includes
- `app/routers/orbit.py` — orbit position endpoint
- `app/routers/imagery.py` — acquisition index + tile URL endpoints
- `app/services/tle.py` — CelesTrak TLE fetcher with caching
- `app/services/propagator.py` — SGP4 propagation logic
- `app/services/stac.py` — Planetary Computer STAC client
- `app/models/schemas.py` — Pydantic models (Position, Acquisition, TileURLResponse)
- `app/config.py` — fixed region bbox, NORAD ID, cache TTLs

## Verification

### Automated

1. Backend unit tests: propagator returns valid lat/lon/alt for known TLE + time
2. Backend unit tests: STAC service returns expected schema (mock API responses)
3. Backend integration test: `/api/orbit` returns 200 with position array
4. Backend integration test: `/api/acquisitions` returns items within bbox+date range
5. Frontend: Playwright E2E — globe loads, orbit visible, marker clickable

### Manual

1. Visually confirm orbit path matches Sentinel-2's known sun-synchronous retrograde orbit (~98.6° inclination)
2. Confirm "!" markers correspond to real Sentinel-2 acquisitions (cross-check against Copernicus Browser)
3. Confirm draped imagery georegisters correctly (coastlines/borders align with base layer)
4. Scrub timeline back 30 days → orbit and markers update, no stale data

## Scope Boundaries

- **In scope**: Sentinel-2A only, fixed region, 30-day window, basic image draping, Docker Compose local dev
- **Out of scope**: Multiple satellites, global coverage, Sentinel-2B, real-time push updates, user authentication, persistent database, deployment to cloud, cloud masking/band compositing, satellite 3D model (use a point or simple icon)

## Open Items / Future Considerations

1. **Fixed region choice**: SE Australia (bbox: `[140, -40, 155, -28]`) — good mix of land/coast, frequent clear skies, visually interesting. Can be changed in `app/config.py`.
2. **TLE staleness**: For the 30-day window, ideally fetch TLE with epoch closest to query time. For v1, using the latest TLE is acceptable (< 5km error within 30 days for LEO).
3. **Planetary Computer rate limits**: Free tier is generous. Caching STAC responses (30-min TTL) and tile URLs (1-hour TTL) should be sufficient.
