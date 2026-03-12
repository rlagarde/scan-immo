"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  GeolocateControl,
  ScaleControl,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import type { MapPoint } from "@/hooks/use-dvf";
import type { MapRef } from "react-map-gl/maplibre";
import type { GeoJSON } from "geojson";

const INITIAL_VIEW = {
  longitude: -1.0,
  latitude: 43.5,
  zoom: 8,
};

const TILE_LIGHT =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const TILE_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function pointsToGeoJSON(points: MapPoint[]): GeoJSON {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude],
      },
      properties: {
        id_mutation: p.id_mutation,
        valeur_fonciere: p.valeur_fonciere,
        prix_m2: p.prix_m2,
        type_local: p.type_local,
        nom_commune: p.nom_commune,
        surface_reelle_bati: p.surface_reelle_bati,
        surface_terrain: p.surface_terrain,
        nombre_pieces_principales: p.nombre_pieces_principales,
        date_mutation: p.date_mutation,
      },
    })),
  };
}

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR") + " €";
}

interface PopupInfo {
  longitude: number;
  latitude: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

const PRICE_COLOR_STOPS: (string | number)[] = [
  0, "#fef3c7",
  100000, "#fde68a",
  200000, "#fcd34d",
  300000, "#f59e0b",
  400000, "#ea580c",
  600000, "#c2410c",
];

function createSquareSDF(size: number) {
  const data = new Uint8ClampedArray(size * size * 4);
  const half = size / 2;
  const squareHalf = half - 2;
  const buffer = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = squareHalf - Math.abs(x - half + 0.5);
      const dy = squareHalf - Math.abs(y - half + 0.5);
      const dist = Math.min(dx, dy);
      const alpha = Math.max(0, Math.min(255, 192 + (dist / buffer) * 64));
      const idx = (y * size + x) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = Math.round(alpha);
    }
  }
  return { width: size, height: size, data };
}

export function DvfMap({ points }: { points: MapPoint[] }) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON>(pointsToGeoJSON([]));
  const [cursor, setCursor] = useState<string>("grab");
  const tileUrl = resolvedTheme === "dark" ? TILE_DARK : TILE_LIGHT;

  useEffect(() => {
    setGeojson(pointsToGeoJSON(points));
  }, [points]);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || map.hasImage("square-sdf")) return;
    map.addImage("square-sdf", createSquareSDF(24), { sdf: true });
  }, []);

  const onClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      const feature = event.features?.[0];
      if (!feature) {
        setPopupInfo(null);
        return;
      }
      const coords = feature.geometry.coordinates;
      setPopupInfo({
        longitude: coords[0],
        latitude: coords[1],
        properties: feature.properties,
      });
    },
    []
  );

  return (
    <div className="w-full">
      <div className="h-[400px] lg:h-[500px] rounded-lg overflow-hidden border">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle={tileUrl}
        interactiveLayerIds={["hab-maison-circles", "hab-appart-symbols"]}
        onLoad={onMapLoad}
        onClick={onClick}
        cursor={cursor}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => {
          const zoom = mapRef.current?.getZoom() ?? 0;
          setCursor(zoom >= 12 ? "crosshair" : "grab");
        }}
        onZoomEnd={() => {
          const zoom = mapRef.current?.getZoom() ?? 0;
          setCursor(zoom >= 12 ? "crosshair" : "grab");
        }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-left" />

        <Source id="hab-data" type="geojson" data={geojson}>
          {/* Heatmap — visible at low zoom, fades out */}
          <Layer
            id="hab-heat"
            type="heatmap"
            maxzoom={14}
            paint={{
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                0, 0,
                100000, 0.3,
                300000, 0.6,
                600000, 1,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0, 1,
                13, 3,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(245,158,11,0)",
                0.2, "rgba(253,230,138,0.4)",
                0.4, "rgba(252,211,77,0.5)",
                0.6, "rgba(245,158,11,0.6)",
                0.8, "rgba(234,88,12,0.7)",
                1, "rgba(194,65,12,0.8)",
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0, 2,
                8, 15,
                13, 25,
              ],
              "heatmap-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                11, 0.6,
                14, 0,
              ],
            }}
          />

          {/* Maison — round circles */}
          <Layer
            id="hab-maison-circles"
            type="circle"
            minzoom={10}
            filter={["==", ["get", "type_local"], "Maison"]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 14, 6, 18, 12],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                ...PRICE_COLOR_STOPS,
              ],
              "circle-stroke-width": 1,
              "circle-stroke-color": resolvedTheme === "dark" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
              "circle-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0,
                12, 0.85,
              ],
              "circle-stroke-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0,
                12, 0.85,
              ],
            }}
          />

          {/* Appartement — square symbols */}
          <Layer
            id="hab-appart-symbols"
            type="symbol"
            minzoom={10}
            filter={["==", ["get", "type_local"], "Appartement"]}
            layout={{
              "icon-image": "square-sdf",
              "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.25, 14, 0.5, 18, 0.85],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            }}
            paint={{
              "icon-color": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                ...PRICE_COLOR_STOPS,
              ],
              "icon-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0,
                12, 0.85,
              ],
            }}
          />
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
            maxWidth="280px"
          >
            <div className="text-sm space-y-1 p-1">
              <p className="font-semibold">
                {String(popupInfo.properties.type_local)} —{" "}
                {String(popupInfo.properties.nom_commune)}
              </p>
              <p>Prix : {formatPrice(Number(popupInfo.properties.valeur_fonciere))}</p>
              {Number(popupInfo.properties.prix_m2) > 0 && (
                <p>Prix/m² : {formatPrice(Number(popupInfo.properties.prix_m2))}</p>
              )}
              {Number(popupInfo.properties.surface_reelle_bati) > 0 && (
                <p>Surface : {Number(popupInfo.properties.surface_reelle_bati).toLocaleString("fr-FR")} m²</p>
              )}
              {Number(popupInfo.properties.nombre_pieces_principales) > 0 && (
                <p>Pièces : {String(popupInfo.properties.nombre_pieces_principales)}</p>
              )}
              <p className="text-muted-foreground">
                {String(popupInfo.properties.date_mutation)}
              </p>
            </div>
          </Popup>
        )}
      </Map>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-xs text-muted-foreground px-1 items-center flex-wrap">
        <span>Prix :</span>
        {[
          { color: "#fde68a", label: "< 100k" },
          { color: "#fcd34d", label: "200k" },
          { color: "#f59e0b", label: "300k" },
          { color: "#ea580c", label: "400k" },
          { color: "#c2410c", label: "600k+" },
        ].map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ml-2 border-l pl-2 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-400" />
            Maison
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-amber-400" />
            Appart.
          </span>
        </span>
      </div>
    </div>
  );
}
