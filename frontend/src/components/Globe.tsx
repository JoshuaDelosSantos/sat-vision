import { useEffect, useRef } from "react";
import { Viewer, Ion, OpenStreetMapImageryProvider } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { useOrbit } from "../hooks/useOrbit";
import { useAcquisitions } from "../hooks/useAcquisitions";
import { renderOrbit, clearOrbit } from "./OrbitRenderer";
import {
  renderAcquisitionMarkers,
  clearAcquisitionMarkers,
} from "./AcquisitionMarkers";

// Suppress Ion token warning — we use free OSM tiles
Ion.defaultAccessToken = "";

export default function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const { orbit, error: orbitError, loading: orbitLoading } = useOrbit();
  const {
    data: acqData,
    error: acqError,
    loading: acqLoading,
  } = useAcquisitions();

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

  // Render acquisition markers when data arrives
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (acqData && acqData.acquisitions.length > 0) {
      renderAcquisitionMarkers(viewer, acqData.acquisitions);
    }
    return () => {
      if (viewer && !viewer.isDestroyed()) {
        clearAcquisitionMarkers(viewer);
      }
    };
  }, [acqData]);

  const loading = orbitLoading || acqLoading;
  const error = orbitError || acqError;

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
          {orbitLoading ? "Loading orbit…" : "Loading acquisitions…"}
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
      {acqData && !acqLoading && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 10,
            background: "rgba(0,0,0,0.6)",
            color: "white",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {acqData.count} acquisition{acqData.count !== 1 ? "s" : ""} (last 30
          days)
        </div>
      )}
    </div>
  );
}
