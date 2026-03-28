/** Backend API client — typed fetch wrappers for orbit and acquisition endpoints. */

const API_BASE = "http://localhost:8000";

export interface Position {
  epoch_ms: number;
  lat_deg: number;
  lon_deg: number;
  alt_km: number;
}

export interface OrbitData {
  norad_id: number;
  name: string;
  positions: Position[];
  window_minutes: number;
  step_seconds: number;
}

export interface Acquisition {
  item_id: string;
  datetime: string;
  lat_deg: number;
  lon_deg: number;
  alt_km: number;
  cloud_cover_pct: number | null;
  thumbnail_url: string | null;
  footprint: Record<string, unknown> | null;
  bbox: number[] | null;
}

export interface AcquisitionsData {
  count: number;
  acquisitions: Acquisition[];
}

export interface TileURLData {
  item_id: string;
  tile_url_template: string;
  bbox: number[];
}

export async function fetchOrbit(
  centerIso?: string,
  windowMinutes = 100,
  stepSeconds = 30,
): Promise<OrbitData> {
  const params = new URLSearchParams({
    window_minutes: String(windowMinutes),
    step_seconds: String(stepSeconds),
  });
  if (centerIso) params.set("time", centerIso);

  const res = await fetch(`${API_BASE}/api/orbit?${params}`);
  if (!res.ok) throw new Error(`Orbit API error: ${res.status}`);
  return res.json();
}

export async function fetchAcquisitions(
  start?: string,
  end?: string,
  maxItems = 200,
): Promise<AcquisitionsData> {
  const params = new URLSearchParams({ max_items: String(maxItems) });
  if (start) params.set("start", start);
  if (end) params.set("end", end);

  const res = await fetch(`${API_BASE}/api/acquisitions?${params}`);
  if (!res.ok) throw new Error(`Acquisitions API error: ${res.status}`);
  return res.json();
}

export async function fetchTileUrl(itemId: string): Promise<TileURLData> {
  const res = await fetch(`${API_BASE}/api/imagery/${encodeURIComponent(itemId)}/tile-url`);
  if (!res.ok) throw new Error(`Tile URL API error: ${res.status}`);
  return res.json();
}
