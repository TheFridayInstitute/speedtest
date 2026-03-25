import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cellToBoundary } from "h3-js";
import { ref, shallowRef, type Ref, type ShallowRef } from "vue";

// ── Types ──────────────────────────────────────────────────────────────

export interface HexData {
    h3Index: string;
    count: number;
    avg: number;
    min: number;
    max: number;
}

export interface UseMaplibreOptions {
    /** MapTiler (or any) vector-tile style URL. */
    style?: string;
    /** [lng, lat] */
    center?: [number, number];
    zoom?: number;
}

// ── Constants ──────────────────────────────────────────────────────────

// NOTE: VITE_MAPTILER_KEY is read from .env at Vite startup.
// If you add/change the key, you must restart the dev server.
const DEFAULT_STYLE = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${
    import.meta.env.VITE_MAPTILER_KEY ?? "get_your_own_key"
}`;
const DEFAULT_CENTER: [number, number] = [-79.0, 35.8]; // NC
const DEFAULT_ZOOM = 7;

const HEX_SOURCE = "hex-source";
const HEX_FILL_LAYER = "hex-fill";
const HEX_LINE_LAYER = "hex-line";
const HEX_HIGHLIGHT_LAYER = "hex-highlight";

// ── Helpers ────────────────────────────────────────────────────────────

/** Build a GeoJSON FeatureCollection from an array of HexData. */
function hexDataToGeoJSON(
    hexData: HexData[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
    const features: GeoJSON.Feature<GeoJSON.Polygon>[] = hexData.map(
        (hex, i) => {
            // cellToBoundary with `true` returns [lng, lat] pairs (GeoJSON order)
            const boundary = cellToBoundary(hex.h3Index, true);
            // Close the ring
            const ring = [...boundary, boundary[0]];
            return {
                type: "Feature" as const,
                id: i,
                properties: {
                    h3Index: hex.h3Index,
                    count: hex.count,
                    avg: hex.avg,
                    min: hex.min,
                    max: hex.max,
                },
                geometry: {
                    type: "Polygon" as const,
                    coordinates: [ring],
                },
            };
        },
    );

    return { type: "FeatureCollection", features };
}

// ── Composable ─────────────────────────────────────────────────────────

export function useMaplibre() {
    const map: ShallowRef<maplibregl.Map | null> = shallowRef(null);
    const isLoaded: Ref<boolean> = ref(false);

    // Keep a reference to the current hex data for lookups
    let currentHexData: HexData[] = [];
    let highlightedIndices: Set<string> = new Set();

    // Click / hover callbacks
    let clickCallback: ((h3Index: string) => void) | null = null;
    let hoverCallback:
        | ((
              h3Index: string | null,
              lngLat: [number, number],
              data: HexData | null,
          ) => void)
        | null = null;

    // ── Init ───────────────────────────────────────────────────────────

    function initMap(
        container: HTMLElement,
        options?: UseMaplibreOptions,
    ): void {
        if (map.value) {
            map.value.remove();
        }

        const m = new maplibregl.Map({
            container,
            style: options?.style ?? DEFAULT_STYLE,
            center: options?.center ?? DEFAULT_CENTER,
            zoom: options?.zoom ?? DEFAULT_ZOOM,
            attributionControl: true,
        });

        m.addControl(new maplibregl.NavigationControl(), "bottom-right");

        m.on("load", () => {
            isLoaded.value = true;
            setupLayers(m);
            setupInteractions(m);
        });

        map.value = m;
    }

    // ── Layer setup ────────────────────────────────────────────────────

    function setupLayers(m: maplibregl.Map): void {
        // Empty source — will be populated by setH3Layer
        m.addSource(HEX_SOURCE, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            promoteId: "h3Index",
        });

        // Fill layer with data-driven color and opacity
        m.addLayer({
            id: HEX_FILL_LAYER,
            type: "fill",
            source: HEX_SOURCE,
            paint: {
                "fill-color": [
                    "interpolate",
                    ["linear"],
                    ["get", "avg"],
                    0,
                    "#3b82f6", // blue
                    25,
                    "#22c55e", // green
                    50,
                    "#eab308", // yellow
                    100,
                    "#ef4444", // red
                ],
                "fill-opacity": [
                    "interpolate",
                    ["linear"],
                    ["get", "count"],
                    1,
                    0.35,
                    10,
                    0.6,
                    50,
                    0.8,
                ],
            },
        });

        // Outline for all hexes
        m.addLayer({
            id: HEX_LINE_LAYER,
            type: "line",
            source: HEX_SOURCE,
            paint: {
                "line-color": "rgba(255,255,255,0.4)",
                "line-width": 1,
            },
        });

        // Highlight layer using feature-state
        m.addLayer({
            id: HEX_HIGHLIGHT_LAYER,
            type: "line",
            source: HEX_SOURCE,
            paint: {
                "line-color": [
                    "case",
                    ["boolean", ["feature-state", "highlighted"], false],
                    "#ffffff",
                    "rgba(0,0,0,0)",
                ],
                "line-width": [
                    "case",
                    ["boolean", ["feature-state", "highlighted"], false],
                    3,
                    0,
                ],
            },
        });
    }

    function setupInteractions(m: maplibregl.Map): void {
        // Click
        m.on("click", HEX_FILL_LAYER, (e) => {
            if (!clickCallback || !e.features?.length) return;
            const h3Index = e.features[0].properties?.h3Index;
            if (h3Index) clickCallback(h3Index);
        });

        // Hover
        let hoveredId: string | null = null;

        m.on("mousemove", HEX_FILL_LAYER, (e) => {
            if (!e.features?.length) return;

            m.getCanvas().style.cursor = "pointer";

            const h3Index = e.features[0].properties?.h3Index as string;
            if (h3Index === hoveredId) {
                // Same cell — still fire callback for position update
                if (hoverCallback) {
                    const data =
                        currentHexData.find((d) => d.h3Index === h3Index) ??
                        null;
                    hoverCallback(
                        h3Index,
                        [e.lngLat.lng, e.lngLat.lat],
                        data,
                    );
                }
                return;
            }

            hoveredId = h3Index;

            if (hoverCallback) {
                const data =
                    currentHexData.find((d) => d.h3Index === h3Index) ?? null;
                hoverCallback(h3Index, [e.lngLat.lng, e.lngLat.lat], data);
            }
        });

        m.on("mouseleave", HEX_FILL_LAYER, () => {
            m.getCanvas().style.cursor = "";
            hoveredId = null;
            if (hoverCallback) hoverCallback(null, [0, 0], null);
        });
    }

    // ── Public API ─────────────────────────────────────────────────────

    /**
     * Update the hex layer with new data and configure the color ramp for the
     * given metric. The color stops are automatically scaled to the data range.
     */
    function setH3Layer(hexData: HexData[], metric: string): void {
        const m = map.value;
        if (!m || !isLoaded.value) return;

        currentHexData = hexData;

        const geojson = hexDataToGeoJSON(hexData);
        const source = m.getSource(HEX_SOURCE) as maplibregl.GeoJSONSource;
        if (!source) return;
        source.setData(geojson);

        // Compute data-driven color ramp based on actual range
        if (hexData.length === 0) return;

        const values = hexData.map((d) => d.avg);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const range = maxVal - minVal || 1;
        const q1 = minVal + range * 0.33;
        const q2 = minVal + range * 0.66;

        // For latency metrics, invert the ramp (low = good = green, high = bad = red)
        const isLatency = metric === "ping" || metric === "jitter";
        const colorStops: [number, string][] = isLatency
            ? [
                  [minVal, "#22c55e"], // green (low = good)
                  [q1, "#eab308"], // yellow
                  [q2, "#f97316"], // orange
                  [maxVal, "#ef4444"], // red (high = bad)
              ]
            : [
                  [minVal, "#ef4444"], // red (low = bad)
                  [q1, "#eab308"], // yellow
                  [q2, "#22c55e"], // green
                  [maxVal, "#3b82f6"], // blue (high = good)
              ];

        m.setPaintProperty(HEX_FILL_LAYER, "fill-color", [
            "interpolate",
            ["linear"],
            ["get", "avg"],
            ...colorStops.flat(),
        ]);

        // Re-apply highlights after data change
        if (highlightedIndices.size > 0) {
            highlightCells([...highlightedIndices]);
        }
    }

    /** Highlight specific hex cells with a bright outline using feature-state. */
    function highlightCells(indices: string[]): void {
        const m = map.value;
        if (!m || !isLoaded.value) return;

        // Clear previous highlights
        clearHighlight();

        highlightedIndices = new Set(indices);

        // Set feature-state for highlighted cells
        for (const h3Index of indices) {
            m.setFeatureState(
                { source: HEX_SOURCE, id: h3Index },
                { highlighted: true },
            );
        }
    }

    /** Remove all highlights. */
    function clearHighlight(): void {
        const m = map.value;
        if (!m || !isLoaded.value) return;

        for (const h3Index of highlightedIndices) {
            m.removeFeatureState(
                { source: HEX_SOURCE, id: h3Index },
                "highlighted",
            );
        }
        highlightedIndices.clear();
    }

    /** Register a click callback on the hex layer. */
    function onCellClick(callback: (h3Index: string) => void): void {
        clickCallback = callback;
    }

    /** Register a hover callback for tooltip display. */
    function onCellHover(
        callback: (
            h3Index: string | null,
            lngLat: [number, number],
            data: HexData | null,
        ) => void,
    ): void {
        hoverCallback = callback;
    }

    /** Fly the map to the given bounds (or the bounds of current hex data). */
    function fitToBounds(bounds?: maplibregl.LngLatBoundsLike): void {
        const m = map.value;
        if (!m) return;

        if (bounds) {
            m.fitBounds(bounds, { padding: 40, maxZoom: 14 });
            return;
        }

        // Auto-fit to current hex data
        if (currentHexData.length === 0) return;

        const allCoords: [number, number][] = [];
        for (const hex of currentHexData) {
            const boundary = cellToBoundary(hex.h3Index, true);
            for (const coord of boundary) {
                allCoords.push(coord as [number, number]);
            }
        }

        if (allCoords.length === 0) return;

        const lngLatBounds = new maplibregl.LngLatBounds(
            allCoords[0],
            allCoords[0],
        );
        for (const coord of allCoords) {
            lngLatBounds.extend(coord);
        }

        m.fitBounds(lngLatBounds, { padding: 40, maxZoom: 14 });
    }

    /** Tear down the map instance and release resources. */
    function destroy(): void {
        clickCallback = null;
        hoverCallback = null;
        currentHexData = [];
        highlightedIndices.clear();
        isLoaded.value = false;

        if (map.value) {
            map.value.remove();
            map.value = null;
        }
    }

    return {
        // Reactive state
        map,
        isLoaded,

        // Methods
        initMap,
        setH3Layer,
        highlightCells,
        clearHighlight,
        onCellClick,
        onCellHover,
        fitToBounds,
        destroy,
    };
}
