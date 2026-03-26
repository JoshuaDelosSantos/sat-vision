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
