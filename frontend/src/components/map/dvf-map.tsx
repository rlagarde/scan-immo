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
  longitude: -0.8,
  latitude: 44.0,
  zoom: 7,
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

  const onClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      const feature = event.features?.[0];
      if (!feature) {
        setPopupInfo(null);
        return;
      }

      // Cluster click → zoom in
      if (feature.properties?.cluster) {
        const map = mapRef.current?.getMap();
        if (map) {
          const source = map.getSource("hab-data") as any;
          if (source?.getClusterExpansionZoom) {
            const result = source.getClusterExpansionZoom(feature.properties.cluster_id);
            // Handle both promise and callback APIs
            if (result && typeof result.then === "function") {
              result.then((zoom: number) => {
                map.easeTo({ center: feature.geometry.coordinates, zoom: zoom + 1 });
              });
            }
          }
        }
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
        key={tileUrl}
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle={tileUrl}
        fadeDuration={0}
        interactiveLayerIds={["hab-clusters", "hab-maison-circles", "hab-appart-circles"]}
        onClick={onClick}
        cursor={cursor}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("grab")}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-left" />

        <Source
          id="hab-data"
          type="geojson"
          data={geojson}
          cluster={true}
          clusterMaxZoom={9}
          clusterRadius={50}
        >
          {/* Cluster circles */}
          <Layer
            id="hab-clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#fde68a",   // < 50
                50, "#fcd34d",
                200, "#f59e0b",
                1000, "#ea580c",
                5000, "#c2410c",
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                15,          // < 50
                50, 20,
                200, 25,
                1000, 32,
                5000, 40,
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": resolvedTheme === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)",
            }}
          />

          {/* Cluster count label */}
          <Layer
            id="hab-cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": "{point_count_abbreviated}",
              "text-size": 12,
              "text-font": ["Open Sans Bold"],
              "text-allow-overlap": true,
            }}
            paint={{
              "text-color": resolvedTheme === "dark" ? "#fff" : "#1a1a1a",
            }}
          />

          {/* Maison — thick brown stroke (unclustered) */}
          <Layer
            id="hab-maison-circles"
            type="circle"
            filter={["all",
              ["!", ["has", "point_count"]],
              ["==", ["get", "type_local"], "Maison"],
            ]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2, 12, 4, 14, 6, 18, 12],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                ...PRICE_COLOR_STOPS,
              ],
              "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 14, 3, 18, 4],
              "circle-stroke-color": resolvedTheme === "dark" ? "#78350f" : "#92400e",
              "circle-opacity": 0.85,
              "circle-stroke-opacity": 0.9,
            }}
          />

          {/* Appartement — thin stroke (unclustered) */}
          <Layer
            id="hab-appart-circles"
            type="circle"
            filter={["all",
              ["!", ["has", "point_count"]],
              ["==", ["get", "type_local"], "Appartement"],
            ]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2, 12, 3.5, 14, 5.5, 18, 11],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                ...PRICE_COLOR_STOPS,
              ],
              "circle-stroke-width": 1,
              "circle-stroke-color": resolvedTheme === "dark" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
              "circle-opacity": 0.85,
              "circle-stroke-opacity": 0.85,
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
            <span className="inline-block w-4 h-4 rounded-full bg-amber-400 ring-[3px] ring-amber-900" />
            Maison
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-400" />
            Appart.
          </span>
        </span>
      </div>
    </div>
  );
}
