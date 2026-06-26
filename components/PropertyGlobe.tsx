"use client";

import { useEffect, useRef, useState } from "react";
import type { Property } from "../lib/types";

type CesiumModule = typeof import("cesium");
type CesiumViewer = import("cesium").Viewer;

interface PropertyGlobeProps {
  selectedProperty?: Property;
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

export function PropertyGlobe({ selectedProperty }: PropertyGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const latestSelectedRef = useRef<Property | undefined>(selectedProperty);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || viewerRef.current) {
        return;
      }

      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

      if (!key) {
        setStatus("Missing Google Maps key");
        return;
      }

      window.CESIUM_BASE_URL = "/cesium";
      const Cesium = await import("cesium");

      if (cancelled || !containerRef.current) {
        return;
      }

      cesiumRef.current = Cesium;
      Cesium.RequestScheduler.requestsByServer["tile.googleapis.com:443"] = 18;

      const viewer = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        timeline: false,
        animation: false,
        fullscreenButton: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        requestRenderMode: true,
      });

      viewer.scene.globe.show = false;
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = false;
      }
      viewer.scene.requestRender();
      viewerRef.current = viewer;

      try {
        const tileset = await Cesium.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(key)}`,
          { showCreditsOnScreen: true },
        );

        if (!cancelled) {
          viewer.scene.primitives.add(tileset);
          flyToProperty(Cesium, viewer, latestSelectedRef.current);
        }
      } catch {
        setStatus("3D tiles did not load");
      }
    }

    void init();

    return () => {
      cancelled = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
      cesiumRef.current = null;
    };
  }, []);

  useEffect(() => {
    latestSelectedRef.current = selectedProperty;

    if (cesiumRef.current && viewerRef.current) {
      flyToProperty(cesiumRef.current, viewerRef.current, selectedProperty);
    }
  }, [selectedProperty]);

  return (
    <div className="relative h-full min-h-[520px] w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#11100e] to-transparent" />
      {status ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#11100e]/70 px-6 text-center text-sm text-[#f4eee4]/74">
          {status}
        </div>
      ) : null}
    </div>
  );
}

function flyToProperty(Cesium: CesiumModule, viewer: CesiumViewer, property?: Property) {
  const lat = property?.lat ?? 25.197197;
  const lng = property?.lng ?? 55.274376;
  const heading = property?.cameraHeading ?? 210;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 350),
    orientation: {
      heading: Cesium.Math.toRadians(heading),
      pitch: Cesium.Math.toRadians(-35),
      roll: 0,
    },
    duration: property ? 2.4 : 1.2,
  });
}
