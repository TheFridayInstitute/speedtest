/** Supported field input types, mapping to shadcn components. */
export type SurveyFieldType =
    | "text"
    | "number"
    | "email"
    | "tel"
    | "select"
    | "radio"
    | "checkbox"
    | "textarea"
    | "address"
    | "readonly";

/** Where a field's value can be auto-populated from. */
export interface AutoPopulateSource {
    source: "ipInfo" | "lookedUpIp" | "geolocation";
    /** Dot-notation path into the source object. */
    path: string;
}

/** Conditional visibility rule. */
export interface VisibilityRule {
    field: string;
    operator: "eq" | "neq" | "in" | "notIn";
    value: string | string[];
}

/** A single field within a survey step. */
export interface SurveyFieldConfig {
    id: string;
    label: string;
    type: SurveyFieldType;
    placeholder?: string;
    description?: string;
    required?: boolean;
    autoPopulate?: AutoPopulateSource;
    editable?: boolean;
    options?: Array<{ label: string; value: string }>;
    visibleWhen?: VisibilityRule;
    colSpan?: 1 | 2;
}

/** A step in the multi-step survey wizard. */
export interface SurveyStepConfig {
    id: string;
    title: string;
    description?: string;
    fields: SurveyFieldConfig[];
    /** Which flow types this step applies to. Omit = all flows. */
    flows?: SurveyFlowType[];
}

/** Top-level survey configuration. */
export interface SurveyConfig {
    id: string;
    version: string;
    timing: "before" | "after";
    skippable: boolean;
    steps: SurveyStepConfig[];
}

export type SurveyFlowType = "school" | "home";

/** Form data keyed by field ID. */
export type SurveyFormData = Record<string, unknown>;

/** Payload sent to the backend on submission. */
export interface SurveySubmission {
    surveyId: string;
    surveyVersion: string;
    flowType: SurveyFlowType;
    answers: SurveyFormData;
    timestamp: number;
}
