<template>
    <SurveyWizard
        ref="surveyRef"
        :config="surveyConfig"
        :ip-info="ipInfo"
        :looked-up-ip="lookedUpIp"
        :geo-bias="geolocation.coordinates.value"
        @submit="onSurveySubmit"
        @skip="onSurveySkip"
    />
</template>

<script setup lang="ts">
import { ref, inject } from "vue";
import { useRouter } from "vue-router";
import SurveyWizard from "@src/components/survey/SurveyWizard.vue";
import { useAPI } from "@src/composables/useAPI";
import { useIPInfo } from "@src/composables/useIPInfo";
import { useGeolocation } from "@src/composables/useGeolocation";
import { DEFAULT_SURVEY_CONFIG } from "@src/config/survey";
import type { SurveySubmission } from "@src/types/survey";

const router = useRouter();
const api = inject<ReturnType<typeof useAPI>>("api")!;
const { ipInfo, lookedUpIp } = inject<ReturnType<typeof useIPInfo>>("ipInfoProvider")!;
const geolocation = inject<ReturnType<typeof useGeolocation>>("geolocation")!;

const surveyConfig = DEFAULT_SURVEY_CONFIG;
const surveyRef = ref<any>(null);

async function onSurveySubmit(submission: SurveySubmission) {
    try {
        await api.submitSurvey({
            flow: submission.flowType,
            name: submission.answers.name,
            address: submission.answers.address,
            provider: submission.answers.provider,
            psuId: submission.answers.psuId,
            psuName: submission.answers.psuName,
            entityName: submission.answers.psuName,
            entityId: submission.answers.psuId,
            schoolName: submission.answers.schoolName,
            schoolNumber: submission.answers.schoolNumber,
            classroomName: submission.answers.classroomName,
            classroomNumber: submission.answers.classroomNumber,
            connectionType: submission.answers.connectionType,
        });
    } catch {
        // Best-effort
    }
    router.push({ name: "thankyou" });
}

async function onSurveySkip() {
    try {
        await api.skipSurvey();
    } catch {
        // Best-effort
    }
    router.push({ name: "thankyou" });
}

defineExpose({ surveyRef });
</script>
