import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Viewer,
  Ion,
  OpenStreetMapImageryProvider,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { useOrbit } from "../hooks/useOrbit";
import { useAcquisitions } from "../hooks/useAcquisitions";
import { renderOrbit, clearOrbit } from "./OrbitRenderer";
import {
  renderAcquisitionMarkers,
  clearAcquisitionMarkers,
} from "./AcquisitionMarkers";
import DashboardHUD from "./DashboardHUD";
import type { Acquisition } from "../services/api";

// Suppress Ion token warning — we use free OSM tiles
Ion.defaultAccessToken = "";

export interface GlobeHandle {
  getViewer: () => Viewer | null;
}

interface GlobeProps {
  onMarkerClick?: (acquisition: Acquisition) => void;
  drapedCount?: number;
}

const Globe = forwardRef<GlobeHandle, GlobeProps>(function Globe(
  { onMarkerClick, drapedCount = 0 },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const { orbit, error: orbitError, loading: orbitLoading } = useOrbit();
  const {
    data: acqData,
    error: acqError,
    loading: acqLoading,
  } = useAcquisitions();

  useImperativeHandle(ref, () => ({
    getViewer: () => viewerRef.current,
  }));

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
      infoBox: false,
      selectionIndicator: false,
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

  // Handle clicks on acquisition markers
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: { x: number; y: number } }) => {
      const picked = viewer.scene.pick(click.position);
      if (defined(picked) && picked.id && picked.id.properties) {
        try {
          const acqData = picked.id.properties.acquisitionData;
          if (acqData) {
            const value = acqData.getValue
              ? acqData.getValue(viewer.clock.currentTime)
              : acqData;
            if (value && value.item_id) {
              onMarkerClick?.(value as Acquisition);
            }
          }
        } catch {
          // Not an acquisition marker
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [onMarkerClick]);

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

  const getViewer = useCallback(() => viewerRef.current, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <DashboardHUD
        getViewer={getViewer}
        orbit={orbit}
        acquisitions={acqData}
        drapedCount={drapedCount}
      />

      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "10px 20px",
            borderRadius: 6,
            fontSize: 13,
            zIndex: 20,
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
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(200,0,0,0.85)",
            color: "white",
            padding: "6px 16px",
            borderRadius: 4,
            fontSize: 13,
            zIndex: 20,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
});

export default Globe;
