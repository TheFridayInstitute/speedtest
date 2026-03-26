import { ref, onUnmounted, type Ref } from "vue";
import type { GeoCoordinates } from "./useGeolocation";

export interface ParsedAddress {
    formatted: string;
    placeId: string;
    lat: number;
    lng: number;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

interface PlacePrediction {
    description: string;
    place_id: string;
}

/**
 * Wait for the Google Maps Places library to become available.
 * Polls every 100ms up to a configurable timeout (default 10s).
 */
export function waitForGooglePlaces(timeoutMs = 10000): Promise<boolean> {
    return new Promise((resolve) => {
        // Already available
        if (
            typeof google !== "undefined" &&
            google.maps?.places?.AutocompleteService
        ) {
            resolve(true);
            return;
        }

        const start = Date.now();
        const interval = setInterval(() => {
            if (
                typeof google !== "undefined" &&
                google.maps?.places?.AutocompleteService
            ) {
                clearInterval(interval);
                resolve(true);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                console.warn(
                    "[useGooglePlaces] Timed out waiting for Google Maps Places API",
                );
                resolve(false);
            }
        }, 100);
    });
}

/**
 * Programmatic Google Places Autocomplete.
 * Uses AutocompleteService (not the widget) so the dropdown
 * can be rendered with our own shadcn Command component.
 */
export function useGooglePlaces(bias?: Ref<GeoCoordinates | null>) {
    const query: Ref<string> = ref("");
    const predictions: Ref<PlacePrediction[]> = ref([]);
    const selectedPlace: Ref<ParsedAddress | null> = ref(null);
    const isSearching: Ref<boolean> = ref(false);

    let autocompleteService: google.maps.places.AutocompleteService | null =
        null;
    let placesService: google.maps.places.PlacesService | null = null;
    let placesServiceElement: HTMLDivElement | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    /** Resolved once the API is confirmed available (or timed out). */
    const apiReady: Promise<boolean> = waitForGooglePlaces();

    function ensureServices(): boolean {
        if (typeof google === "undefined" || !google.maps?.places)
            return false;
        if (!autocompleteService) {
            autocompleteService =
                new google.maps.places.AutocompleteService();
        }
        if (!placesService) {
            // PlacesService requires an HTMLDivElement that is attached to the DOM.
            placesServiceElement = document.createElement("div");
            placesServiceElement.style.display = "none";
            document.body.appendChild(placesServiceElement);
            placesService = new google.maps.places.PlacesService(
                placesServiceElement,
            );
        }
        return true;
    }

    /** Debounced search for place predictions. */
    function search(input: string): void {
        query.value = input;
        if (debounceTimer) clearTimeout(debounceTimer);

        if (!input || input.length < 3) {
            predictions.value = [];
            return;
        }

        debounceTimer = setTimeout(async () => {
            // Wait for the API to load before trying to use it
            const ready = await apiReady;
            if (!ready || !ensureServices() || !autocompleteService) return;

            isSearching.value = true;
            const request: google.maps.places.AutocompletionRequest = {
                input,
                types: ["address"],
            };
            if (bias?.value) {
                request.location = new google.maps.LatLng(
                    bias.value.lat,
                    bias.value.lng,
                );
                request.radius = 50000; // 50 km
            }

            autocompleteService.getPlacePredictions(
                request,
                (results, status) => {
                    isSearching.value = false;
                    if (
                        status ===
                            google.maps.places.PlacesServiceStatus.OK &&
                        results
                    ) {
                        predictions.value = results.map((r) => ({
                            description: r.description,
                            place_id: r.place_id,
                        }));
                    } else {
                        predictions.value = [];
                    }
                },
            );
        }, 300);
    }

    /** Select a prediction and fetch full place details. */
    async function select(placeId: string): Promise<void> {
        const ready = await apiReady;
        if (!ready || !ensureServices() || !placesService) return;

        placesService.getDetails(
            { placeId, fields: ["address_components", "geometry", "formatted_address"] },
            (place, status) => {
                if (
                    status !== google.maps.places.PlacesServiceStatus.OK ||
                    !place
                )
                    return;

                selectedPlace.value = parsePlaceResult(place, placeId);
                predictions.value = [];
                query.value = selectedPlace.value?.formatted ?? "";
            },
        );
    }

    /** Clear current selection. */
    function clear(): void {
        selectedPlace.value = null;
        predictions.value = [];
        query.value = "";
    }

    // Clean up the hidden DOM element on unmount
    onUnmounted(() => {
        placesServiceElement?.remove();
        if (debounceTimer) clearTimeout(debounceTimer);
    });

    return {
        query,
        predictions,
        selectedPlace,
        isSearching,
        search,
        select,
        clear,
        /** Resolves to true once the Google Maps Places API is loaded. */
        apiReady,
    };
}

// ── Helpers ───────────────────────────────────────────────────────────

function parsePlaceResult(
    place: google.maps.places.PlaceResult,
    placeId: string,
): ParsedAddress {
    const components = place.address_components ?? [];
    const get = (type: string): string =>
        components.find((c) => c.types.includes(type))?.long_name ?? "";

    return {
        formatted: place.formatted_address ?? "",
        placeId,
        lat: place.geometry?.location?.lat() ?? 0,
        lng: place.geometry?.location?.lng() ?? 0,
        street: `${get("street_number")} ${get("route")}`.trim(),
        city:
            get("locality") ||
            get("sublocality_level_1") ||
            get("administrative_area_level_2"),
        state: get("administrative_area_level_1"),
        zip: get("postal_code"),
        country: get("country"),
    };
}
