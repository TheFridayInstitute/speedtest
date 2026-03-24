import { watch, type Ref } from "vue";
import type { IPInfo, LookedUpIP } from "@src/types/dns";
import type { SurveyFieldConfig, SurveyFormData } from "@src/types/survey";
import { getByPath } from "@src/utils/dotpath";

interface AutoPopulateSources {
    ipInfo: Ref<IPInfo | null>;
    lookedUpIp: Ref<LookedUpIP | null>;
}

/**
 * Watches IP data refs and auto-populates matching survey fields.
 * Returns nothing — mutates formData in place.
 */
export function useSurveyAutoPopulate(
    fields: SurveyFieldConfig[],
    formData: Ref<SurveyFormData>,
    sources: AutoPopulateSources,
): void {
    const autoFields = fields.filter((f) => f.autoPopulate);
    if (autoFields.length === 0) return;

    function populate(): void {
        for (const field of autoFields) {
            const src = field.autoPopulate!;
            let sourceObj: unknown = null;

            if (src.source === "ipInfo") {
                sourceObj = sources.ipInfo.value;
            } else if (src.source === "lookedUpIp") {
                sourceObj = sources.lookedUpIp.value;
            }

            if (sourceObj != null) {
                const value = getByPath(sourceObj, src.path);
                if (value !== undefined && value !== null) {
                    formData.value[field.id] = value;
                }
            }
        }
    }

    // Populate immediately with current data
    populate();

    // Re-populate when sources change
    watch([sources.ipInfo, sources.lookedUpIp], populate);
}
