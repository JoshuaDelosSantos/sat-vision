/** Side panel — shows acquisition thumbnail, metadata, and drape/remove controls. */

import { useState } from "react";
import type { Acquisition, TileURLData } from "../services/api";
import { fetchTileUrl } from "../services/api";
import type { DrapedLayer } from "./ImageryDraper";

interface ImagePanelProps {
  acquisition: Acquisition | null;
  onDrape: (itemId: string, tileData: TileURLData) => void;
  onToggle: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onClose: () => void;
  drapedLayers: DrapedLayer[];
}

export default function ImagePanel({
  acquisition,
  onDrape,
  onToggle,
  onRemove,
  onClose,
  drapedLayers,
}: ImagePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrape = async () => {
    if (!acquisition) return;
    setLoading(true);
    setError(null);
    try {
      const tileData = await fetchTileUrl(acquisition.item_id);
      onDrape(acquisition.item_id, tileData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tile URL");
    } finally {
      setLoading(false);
    }
  };

  const isDraped = acquisition
    ? drapedLayers.some((l) => l.itemId === acquisition.item_id)
    : false;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Image Details</span>
        <button onClick={onClose} style={closeBtnStyle}>
          ✕
        </button>
      </div>

      {acquisition ? (
        <div style={{ padding: "0 12px 12px" }}>
          {/* Thumbnail */}
          {acquisition.thumbnail_url && (
            <img
              src={acquisition.thumbnail_url}
              alt={acquisition.item_id}
              style={thumbStyle}
            />
          )}

          {/* Metadata */}
          <div style={metaStyle}>
            <Row label="Item" value={acquisition.item_id} />
            <Row label="Date" value={formatDate(acquisition.datetime)} />
            <Row
              label="Cloud"
              value={
                acquisition.cloud_cover_pct != null
                  ? `${acquisition.cloud_cover_pct}%`
                  : "N/A"
              }
            />
            <Row
              label="Position"
              value={`${acquisition.lat_deg.toFixed(2)}°, ${acquisition.lon_deg.toFixed(2)}°`}
            />
          </div>

          {/* Action buttons */}
          {!isDraped ? (
            <button
              onClick={handleDrape}
              disabled={loading}
              style={actionBtnStyle}
            >
              {loading ? "Loading…" : "View on Globe"}
            </button>
          ) : (
            <div style={{ fontSize: 12, color: "#8f8", marginTop: 8 }}>
              ✓ Draped on globe
            </div>
          )}

          {error && (
            <div style={{ color: "#f88", fontSize: 12, marginTop: 6 }}>
              {error}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 12, color: "#999", fontSize: 13 }}>
          Click a <span style={{ color: "red", fontWeight: 700 }}>!</span>{" "}
          marker to inspect an acquisition.
        </div>
      )}

      {/* Draped layers list */}
      {drapedLayers.length > 0 && (
        <div style={{ borderTop: "1px solid #444", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>
            Draped Layers ({drapedLayers.length})
          </div>
          {drapedLayers.map((dl) => (
            <div key={dl.itemId} style={layerRowStyle}>
              <button
                onClick={() => onToggle(dl.itemId)}
                style={smallBtnStyle}
                title={dl.visible ? "Hide" : "Show"}
              >
                {dl.visible ? "👁" : "👁‍🗨"}
              </button>
              <span
                style={{
                  flex: 1,
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {dl.itemId.slice(0, 30)}…
              </span>
              <button
                onClick={() => onRemove(dl.itemId)}
                style={smallBtnStyle}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
      <span style={{ color: "#999", fontSize: 12, minWidth: 56 }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

/* ---- Styles ---- */

const panelStyle: React.CSSProperties = {
  width: 320,
  height: "100%",
  background: "#1e1e1e",
  color: "#eee",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  borderLeft: "1px solid #333",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderBottom: "1px solid #444",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#999",
  fontSize: 16,
  cursor: "pointer",
};

const thumbStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 4,
  marginBottom: 10,
  marginTop: 4,
};

const metaStyle: React.CSSProperties = {
  marginBottom: 8,
};

const actionBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 0",
  background: "#2a6",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  marginTop: 4,
};

const layerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
};

const smallBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#ccc",
  cursor: "pointer",
  fontSize: 14,
  padding: 2,
};
