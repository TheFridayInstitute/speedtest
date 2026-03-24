<template>
    <div class="relative">
        <div class="relative flex items-center">
            <Input
                ref="inputRef"
                type="text"
                class="w-full pr-10"
                :placeholder="placeholder"
                :model-value="places.query.value"
                @update:model-value="onInput"
                @focus="onFocus"
                @blur="onBlur"
            />
            <!-- Inline geolocate button -->
            <Button
                type="button"
                variant="ghost"
                size="icon"
                class="absolute right-1 h-8 w-8"
                title="Use my location"
                :disabled="isGeolocating"
                @click.prevent="geolocate"
            >
                <MapPin v-if="!isGeolocating" class="h-4 w-4" />
                <LoaderCircle v-else class="h-4 w-4 animate-spin" />
            </Button>
        </div>

        <!-- Predictions dropdown -->
        <Transition name="fade">
            <div
                v-if="showDropdown && places.predictions.value.length > 0"
                class="glass-elevated absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-2xl p-1"
            >
                <button
                    v-for="pred in places.predictions.value"
                    :key="pred.place_id"
                    class="w-full rounded-xl px-3 py-2 text-left text-lg hover:bg-accent/10 transition-colors"
                    @mousedown.prevent="selectPrediction(pred.place_id)"
                >
                    {{ pred.description }}
                </button>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { MapPin, LoaderCircle } from "lucide-vue-next";
import { Button } from "@mkbabb/glass-ui";
import { Input } from "@mkbabb/glass-ui";
import { useGooglePlaces, waitForGooglePlaces, type ParsedAddress } from "@src/composables/useGooglePlaces";
import { useGeolocation, type GeoCoordinates } from "@src/composables/useGeolocation";
import type { Ref } from "vue";

const props = defineProps<{
    modelValue: ParsedAddress | null;
    placeholder?: string;
    bias?: GeoCoordinates | null;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: ParsedAddress | null];
}>();

const biasRef = ref(props.bias ?? null) as Ref<GeoCoordinates | null>;
watch(() => props.bias, (v) => { biasRef.value = v ?? null; });

const places = useGooglePlaces(biasRef);
const geo = useGeolocation();
const inputRef = ref<HTMLInputElement | null>(null);
const showDropdown = ref(false);
const isGeolocating = ref(false);

function onInput(value: string | number) {
    places.search(String(value));
}

function onFocus() {
    showDropdown.value = true;
}

function selectPrediction(placeId: string) {
    places.select(placeId);
    showDropdown.value = false;
}

function onBlur() {
    setTimeout(() => { showDropdown.value = false; }, 200);
}

/** Geolocate and reverse-geocode to fill the address. */
async function geolocate() {
    isGeolocating.value = true;
    try {
        const coords = await geo.requestLocation();
        if (!coords) return;
        biasRef.value = coords;

        // Wait for the Google Maps API to be fully loaded before using Geocoder
        const apiLoaded = await waitForGooglePlaces();
        if (!apiLoaded || typeof google === "undefined" || !google.maps?.Geocoder) {
            console.warn("[AddressAutocomplete] Google Maps Geocoder not available");
            return;
        }

        // Reverse geocode via Google - wrap callback in a Promise so we can
        // keep isGeolocating true until the result arrives.
        const geocoder = new google.maps.Geocoder();
        await new Promise<void>((resolve) => {
            geocoder.geocode(
                { location: { lat: coords.lat, lng: coords.lng } },
                (results, status) => {
                    try {
                        if (status === "OK" && results?.[0]) {
                            const r = results[0];
                            const components = r.address_components ?? [];
                            const get = (type: string) =>
                                components.find((c) => c.types.includes(type))?.long_name ?? "";

                            const parsed: ParsedAddress = {
                                formatted: r.formatted_address ?? "",
                                placeId: r.place_id ?? "",
                                lat: coords.lat,
                                lng: coords.lng,
                                street: `${get("street_number")} ${get("route")}`.trim(),
                                city: get("locality") || get("sublocality_level_1"),
                                state: get("administrative_area_level_1"),
                                zip: get("postal_code"),
                                country: get("country"),
                            };
                            places.query.value = parsed.formatted;
                            emit("update:modelValue", parsed);
                        }
                    } finally {
                        resolve();
                    }
                },
            );
        });
    } catch (err) {
        console.error("[AddressAutocomplete] Geolocate failed:", err);
    } finally {
        isGeolocating.value = false;
    }
}

// Emit when a place is selected
watch(() => places.selectedPlace.value, (place) => {
    if (place) emit("update:modelValue", place);
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
