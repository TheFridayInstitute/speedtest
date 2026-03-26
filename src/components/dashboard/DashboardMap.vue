<template>
    <div class="relative h-full w-full">
        <!-- No API key fallback -->
        <div v-if="!hasMapKey" class="flex h-full items-center justify-center p-8">
            <Card class="max-w-sm p-6 text-center">
                <MapIcon class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p class="text-sm text-muted-foreground">
                    Map requires a MapTiler API key.<br />
                    Set <code class="rounded bg-muted px-1 py-0.5 text-xs">VITE_MAPTILER_KEY</code> in your environment.
                </p>
            </Card>
        </div>

        <!-- Map container -->
        <div v-else ref="mapContainer" class="h-full w-full" />

        <!-- Loading overlay -->
        <div
            v-if="isFetching"
            class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/40"
        >
            <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>

        <!-- Controls overlay (top-right, collapsible) -->
        <DashboardMapControls
            :active-metric="activeMetric"
            :h3-resolution="h3Resolution"
            :controls-open="controlsOpen"
            :hex-data-length="hexData.length"
            @update:active-metric="activeMetric = $event"
            @update:h3-resolution="h3Resolution = $event"
            @update:controls-open="controlsOpen = $event"
            @fit-to-data="maplibre.fitToBounds()"
        />

        <!-- Tooltip -->
        <MapTooltip
            :visible="tooltip.visible"
            :x="tooltip.x"
            :y="tooltip.y"
            :data="tooltip.data"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue";
import { Loader2, Map as MapIcon } from "lucide-vue-next";
import { useDebounceFn, useMediaQuery } from "@vueuse/core";
import { Card } from "@mkbabb/glass-ui";
import { useMaplibre, type HexData } from "./composables/useMaplibre";
import { useDashboardFilterStore, type DashboardMetric } from "@src/stores/useDashboardFilterStore";
import DashboardMapControls from "./DashboardMapControls.vue";
import MapTooltip from "./MapTooltip.vue";
import type { MapTooltipData } from "./MapTooltip.vue";

// ── API Key check ─────────────────────────────────────────────────────

const hasMapKey = computed(() => {
    const key = import.meta.env.VITE_MAPTILER_KEY;
    return !!key && key !== "get_your_own_key";
});

// ── State ──────────────────────────────────────────────────────────────

const mapContainer = ref<HTMLElement | null>(null);
const maplibre = useMaplibre();
const filterStore = useDashboardFilterStore();

const activeMetric = ref<DashboardMetric>("download");
const h3Resolution = ref(5);
const hexData = ref<HexData[]>([]);
const isFetching = ref(false);

// Controls collapse state — auto-collapse on mobile
const isMobile = useMediaQuery("(max-width: 639px)");
const controlsOpen = ref(true);
watch(isMobile, (mobile) => { controlsOpen.value = !mobile; }, { immediate: true });
const fetchError = ref<string | null>(null);

const tooltip = reactive<{
    visible: boolean;
    x: number;
    y: number;
    data: MapTooltipData | null;
}>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
});

// ── Data fetching ──────────────────────────────────────────────────────

async function fetchHexData(): Promise<void> {
    isFetching.value = true;
    fetchError.value = null;

    try {
        const params = new URLSearchParams(filterStore.apiQueryParams);
        params.set("resolution", String(h3Resolution.value));
        params.set("metric", activeMetric.value);

        const resp = await fetch(`/api/dashboard/hex-map?${params}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const body = await resp.json();
        hexData.value = body.data ?? body ?? [];
    } catch (err: any) {
        fetchError.value = err.message;
        hexData.value = [];
    } finally {
        isFetching.value = false;
    }
}

const debouncedFetch = useDebounceFn(fetchHexData, 300);

// ── Map interactions ───────────────────────────────────────────────────

function handleCellClick(h3Index: string): void {
    // Shift-click to add to selection, plain click to replace
    // We can't easily detect shift here since it's inside the map callback,
    // so we track it via a window-level listener.
    if (isShiftHeld) {
        filterStore.addToMapSelection(h3Index);
    } else {
        filterStore.setFromMapSelection([h3Index]);
    }

    maplibre.highlightCells(filterStore.selectedH3Cells);
}

function handleCellHover(
    h3Index: string | null,
    lngLat: [number, number],
    data: HexData | null,
): void {
    if (!h3Index || !data) {
        tooltip.visible = false;
        tooltip.data = null;
        return;
    }

    // Convert lngLat to pixel position relative to the map container
    const m = maplibre.map.value;
    if (!m) return;
    const point = m.project(lngLat);

    tooltip.visible = true;
    tooltip.x = point.x;
    tooltip.y = point.y;
    tooltip.data = {
        metric: activeMetric.value,
        avg: data.avg,
        count: data.count,
        min: data.min,
        max: data.max,
    };
}

// ── Shift key tracking ────────────────────────────────────────────────

let isShiftHeld = false;

function onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Shift") isShiftHeld = true;
}

function onKeyUp(e: KeyboardEvent): void {
    if (e.key === "Shift") isShiftHeld = false;
}

// ── Watchers ───────────────────────────────────────────────────────────

// Re-render when hex data changes
watch(hexData, (data) => {
    maplibre.setH3Layer(data, activeMetric.value);
});

// Re-fetch when metric or resolution changes
watch([activeMetric, h3Resolution], () => {
    debouncedFetch();
});

// Sync active metric back to filter store
watch(activeMetric, (v) => {
    filterStore.activeMetric = v;
});

// Re-fetch when filter store params change (debounced)
watch(
    () => filterStore.apiQueryParams.toString(),
    () => {
        debouncedFetch();
    },
);

// Highlight selected cells when store selection changes
watch(
    () => filterStore.selectedH3Cells,
    (cells) => {
        if (cells.length > 0) {
            maplibre.highlightCells(cells);
        } else {
            maplibre.clearHighlight();
        }
    },
    { deep: true },
);

// ── Lifecycle ──────────────────────────────────────────────────────────

onMounted(() => {
    if (mapContainer.value) {
        maplibre.initMap(mapContainer.value);

        // Register interaction callbacks
        maplibre.onCellClick(handleCellClick);
        maplibre.onCellHover(handleCellHover);

        // Fetch data once map is ready
        const unwatch = watch(
            () => maplibre.isLoaded.value,
            (loaded) => {
                if (loaded) {
                    fetchHexData();
                    unwatch();
                }
            },
            { immediate: true },
        );
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
});

onUnmounted(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    maplibre.destroy();
});
</script>
