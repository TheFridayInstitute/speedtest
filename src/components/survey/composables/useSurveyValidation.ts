import type {
    SurveyStepConfig,
    SurveyFieldConfig,
    SurveyFormData,
} from "@src/types/survey";

/** Per-field error messages keyed by field ID. */
export type ValidationErrors = Record<string, string>;

/**
 * Validate a single step's required fields against form data.
 * Returns an object of fieldId → error message (empty if valid).
 */
export function validateStep(
    step: SurveyStepConfig,
    formData: SurveyFormData,
): ValidationErrors {
    const errors: ValidationErrors = {};

    for (const field of step.fields) {
        if (!field.required) continue;
        if (!isFieldVisible(field, formData)) continue;

        const value = formData[field.id];
        if (isEmpty(value)) {
            errors[field.id] = `${field.label} is required`;
        }
    }

    return errors;
}

/** Check if a step has any validation errors. */
export function isStepValid(
    step: SurveyStepConfig,
    formData: SurveyFormData,
): boolean {
    return Object.keys(validateStep(step, formData)).length === 0;
}

/** Check if a field should be visible based on its visibility rule. */
export function isFieldVisible(
    field: SurveyFieldConfig,
    formData: SurveyFormData,
): boolean {
    if (!field.visibleWhen) return true;

    const { field: depField, operator, value: expected } = field.visibleWhen;
    const actual = formData[depField];

    switch (operator) {
        case "eq":
            return actual === expected;
        case "neq":
            return actual !== expected;
        case "in":
            return Array.isArray(expected) && expected.includes(actual as string);
        case "notIn":
            return Array.isArray(expected) && !expected.includes(actual as string);
        default:
            return true;
    }
}

function isEmpty(value: unknown): boolean {
    if (value == null) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
}
