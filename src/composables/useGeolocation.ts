import { ref } from "vue";
import type { Ref } from "vue";

export interface GeoCoordinates {
    lat: number;
    lng: number;
}

/**
 * Thin wrapper around the browser Geolocation API.
 * Requests permission once; caches the result.
 */
export function useGeolocation() {
    const coordinates: Ref<GeoCoordinates | null> = ref(null);
    const error: Ref<string | null> = ref(null);
    const isRequesting: Ref<boolean> = ref(false);

    async function requestLocation(): Promise<GeoCoordinates | null> {
        if (coordinates.value) return coordinates.value;
        if (!navigator.geolocation) {
            error.value = "Geolocation not supported";
            return null;
        }

        isRequesting.value = true;
        error.value = null;

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    coordinates.value = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    };
                    isRequesting.value = false;
                    resolve(coordinates.value);
                },
                (err) => {
                    error.value = err.message;
                    isRequesting.value = false;
                    resolve(null);
                },
                { enableHighAccuracy: false, timeout: 8000 },
            );
        });
    }

    return { coordinates, error, isRequesting, requestLocation };
}
