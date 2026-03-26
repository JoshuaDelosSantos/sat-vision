import { useEffect, useRef } from "react";
import { Viewer, Ion, OpenStreetMapImageryProvider } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { useOrbit } from "../hooks/useOrbit";
import { renderOrbit, clearOrbit } from "./OrbitRenderer";

// Suppress Ion token warning — we use free OSM tiles
Ion.defaultAccessToken = "";

export default function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const { orbit, error, loading } = useOrbit();

  // Initialise Cesium Viewer once
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Viewer(containerRef.current, {
      timeline: true,
      animation: true,
      homeButton: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      geocoder: false,
      baseLayer: false,
    });

    viewerRef.current = viewer;

    // Add free OSM tiles
    viewer.imageryLayers.addImageryProvider(
      new OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
      }),
    );

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  // Render orbit data when it arrives
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (orbit) {
      renderOrbit(viewer, orbit);
    }
    return () => {
      if (viewer && !viewer.isDestroyed()) {
        clearOrbit(viewer);
      }
    };
  }, [orbit]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "rgba(0,0,0,0.6)",
            color: "white",
            padding: "6px 12px",
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          Loading orbit…
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "rgba(200,0,0,0.8)",
            color: "white",
            padding: "6px 12px",
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
