import type { SurveyConfig } from "@src/types/survey";

export const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
    id: "speedtest-survey-v1",
    version: "1.0.0",
    timing: "after",
    skippable: true,
    steps: [
        {
            id: "flow-select",
            title: "Getting Started",
            description: "Tell us where you're testing from.",
            fields: [
                {
                    id: "flowType",
                    label: "Where are you testing from?",
                    type: "radio",
                    required: false,
                    options: [
                        { label: "School", value: "school" },
                        { label: "Home", value: "home" },
                    ],
                    colSpan: 2,
                },
            ],
        },
        {
            id: "identity",
            title: "Your Info",
            description: "Basic identification.",
            fields: [
                {
                    id: "name",
                    label: "Name",
                    type: "text",
                    placeholder: "Your name",
                    required: false,
                },
                {
                    id: "address",
                    label: "Address",
                    type: "address",
                    placeholder: "Start typing your address\u2026",
                    required: false,
                    colSpan: 2,
                },
            ],
        },
        {
            id: "provider",
            title: "Connection Info",
            description: "Auto-detected from your connection.",
            fields: [
                {
                    id: "provider",
                    label: "Internet Provider",
                    type: "text",
                    autoPopulate: { source: "ipInfo", path: "org" },
                    editable: true,
                    placeholder: "Auto-detected — edit if incorrect",
                    colSpan: 2,
                },
                {
                    id: "psuId",
                    label: "PSU ID",
                    type: "text",
                    autoPopulate: {
                        source: "lookedUpIp",
                        path: "row.Entity ID",
                    },
                    editable: true,
                    placeholder: "Auto-detected",
                    visibleWhen: {
                        field: "flowType",
                        operator: "eq",
                        value: "school",
                    },
                },
                {
                    id: "psuName",
                    label: "PSU / District Name",
                    type: "text",
                    autoPopulate: {
                        source: "lookedUpIp",
                        path: "row.Entity Name",
                    },
                    editable: true,
                    placeholder: "Auto-detected",
                    visibleWhen: {
                        field: "flowType",
                        operator: "eq",
                        value: "school",
                    },
                },
            ],
        },
        {
            id: "school-details",
            title: "School Details",
            description: "Information about your school.",
            flows: ["school"],
            fields: [
                {
                    id: "schoolName",
                    label: "School Name",
                    type: "text",
                    placeholder: "e.g., Lincoln Elementary",
                    required: false,
                },
                {
                    id: "schoolNumber",
                    label: "School Number",
                    type: "text",
                    placeholder: "e.g., 001",
                },
                {
                    id: "classroomName",
                    label: "Classroom Name",
                    type: "text",
                    placeholder: "e.g., Room 204",
                },
                {
                    id: "classroomNumber",
                    label: "Classroom Number",
                    type: "text",
                    placeholder: "e.g., 204",
                },
            ],
        },
        {
            id: "home-details",
            title: "Home Details",
            description: "Your home connection details.",
            flows: ["home"],
            fields: [
                {
                    id: "connectionType",
                    label: "Connection Type",
                    type: "select",
                    options: [
                        { label: "WiFi", value: "wifi" },
                        { label: "Ethernet", value: "ethernet" },
                        { label: "Cellular", value: "cellular" },
                        { label: "Satellite", value: "satellite" },
                        { label: "Other", value: "other" },
                    ],
                },
            ],
        },
        {
            id: "review",
            title: "Review",
            description: "Review your information before submitting.",
            fields: [],
        },
    ],
};
