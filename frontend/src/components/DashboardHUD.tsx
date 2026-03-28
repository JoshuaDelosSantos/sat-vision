/** Minimal heads-up dashboard overlay — mission info, clock, camera, and status. */

import { useEffect, useState, useRef, useCallback, type CSSProperties } from "react";
import { Viewer, Math as CesiumMath } from "cesium";
import type { AcquisitionsData } from "../services/api";

interface DashboardHUDProps {
  getViewer: () => Viewer | null;
  acquisitions: AcquisitionsData | null;
  drapedCount: number;
}

interface CameraState {
  lat: string;
  lon: string;
  alt: string;
}

export default function DashboardHUD({
  getViewer,
  acquisitions,
  drapedCount,
}: DashboardHUDProps) {
  const [utc, setUtc] = useState(formatUTC(new Date()));
  const [camera, setCamera] = useState<CameraState>({ lat: "—", lon: "—", alt: "—" });
  const rafRef = useRef(0);

  const tick = useCallback(() => {
    setUtc(formatUTC(new Date()));

    const viewer = getViewer();
    if (viewer && !viewer.isDestroyed()) {
      const pos = viewer.camera.positionCartographic;
      setCamera({
        lat: CesiumMath.toDegrees(pos.latitude).toFixed(2) + "°",
        lon: CesiumMath.toDegrees(pos.longitude).toFixed(2) + "°",
        alt: formatAlt(pos.height),
      });
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [getViewer]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const passCount = acquisitions
    ? new Set(acquisitions.acquisitions.map((a) => a.datetime.slice(0, 16))).size
    : 0;

  return (
    <>
      {/* ── Top-left: Mission ── */}
      <div style={{ ...panelBase, top: 8, left: 8 }}>
        <div style={titleStyle}>SAT-VISION</div>
        <Row label="Satellite" value="Sentinel-2A" />
        <Row label="NORAD" value="40697" />
        <Row label="Passes" value={acquisitions ? String(passCount) : "—"} />
      </div>

      {/* ── Top-right: Clock ── */}
      <div style={{ ...panelBase, top: 8, right: 8, textAlign: "right" }}>
        <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>
          {utc}
        </div>
        <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>UTC</div>
      </div>

      {/* ── Bottom-left: Status ── */}
      <div style={{ ...panelBase, bottom: 42, left: 8 }}>
        <Row
          label="Acquisitions"
          value={acquisitions ? String(acquisitions.count) : "—"}
        />
        <Row label="Draped" value={String(drapedCount)} />
      </div>

      {/* ── Bottom-right: Camera ── */}
      <div style={{ ...panelBase, bottom: 42, right: 8, textAlign: "right" }}>
        <div style={{ fontSize: 10, color: "#999", marginBottom: 2 }}>CAMERA</div>
        <Row label="Lat" value={camera.lat} />
        <Row label="Lon" value={camera.lon} />
        <Row label="Alt" value={camera.alt} />
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, lineHeight: 1.5 }}>
      <span style={{ color: "#888", fontSize: 11 }}>{label}</span>
      <span style={{ color: "#ddd", fontSize: 11, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

function formatUTC(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", "  ");
}

function formatAlt(metres: number): string {
  if (metres > 1_000_000) return (metres / 1_000_000).toFixed(1) + " Mm";
  if (metres > 1_000) return (metres / 1_000).toFixed(1) + " km";
  return metres.toFixed(0) + " m";
}

/* ---- Shared style ---- */

const panelBase: CSSProperties = {
  position: "absolute",
  background: "rgba(0, 0, 0, 0.55)",
  backdropFilter: "blur(4px)",
  color: "#eee",
  padding: "6px 10px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.08)",
  pointerEvents: "none",
  minWidth: 110,
  zIndex: 10,
};

const titleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: "#0ff",
  marginBottom: 4,
};
