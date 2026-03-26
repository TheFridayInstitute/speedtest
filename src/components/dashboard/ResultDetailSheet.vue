<script setup lang="ts">
import type { DashboardResultRow } from "@src/types/dashboard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, Badge, Separator } from "@mkbabb/glass-ui";

const open = defineModel<boolean>("open", { default: false });

const props = defineProps<{
    row: DashboardResultRow | null;
}>();

function fmt(val: number | null | undefined, unit = ""): string {
    if (val == null) return "\u2014";
    return `${Math.round(val * 100) / 100}${unit ? " " + unit : ""}`;
}

function formatTime(ts: string): string {
    if (!ts) return "\u2014";
    return new Date(ts).toLocaleString();
}
</script>

<template>
    <Sheet v-model:open="open">
        <SheetContent class="overflow-y-auto sm:max-w-lg">
            <SheetHeader>
                <SheetTitle>Result Details</SheetTitle>
            </SheetHeader>

            <template v-if="row">
                <div class="mt-6 space-y-6">
                    <!-- Metrics -->
                    <section>
                        <h4 class="mb-3 text-sm font-medium text-muted-foreground">
                            Metrics
                        </h4>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="rounded-lg bg-muted/30 p-3">
                                <div class="text-xs text-muted-foreground">Download</div>
                                <div class="text-xl font-semibold tabular-nums">
                                    {{ fmt(row.download, "Mbps") }}
                                </div>
                            </div>
                            <div class="rounded-lg bg-muted/30 p-3">
                                <div class="text-xs text-muted-foreground">Upload</div>
                                <div class="text-xl font-semibold tabular-nums">
                                    {{ fmt(row.upload, "Mbps") }}
                                </div>
                            </div>
                            <div class="rounded-lg bg-muted/30 p-3">
                                <div class="text-xs text-muted-foreground">Ping</div>
                                <div class="text-xl font-semibold tabular-nums">
                                    {{ fmt(row.ping, "ms") }}
                                </div>
                            </div>
                            <div class="rounded-lg bg-muted/30 p-3">
                                <div class="text-xs text-muted-foreground">Jitter</div>
                                <div class="text-xl font-semibold tabular-nums">
                                    {{ fmt(row.jitter, "ms") }}
                                </div>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    <!-- Test Info -->
                    <section>
                        <h4 class="mb-3 text-sm font-medium text-muted-foreground">
                            Test Info
                        </h4>
                        <dl class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <dt class="text-muted-foreground">Timestamp</dt>
                                <dd class="tabular-nums">{{ formatTime(row.timestamp) }}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-muted-foreground">Type</dt>
                                <dd>
                                    <Badge variant="outline">{{ row.testType }}</Badge>
                                </dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-muted-foreground">Server</dt>
                                <dd>{{ row.serverName || "\u2014" }}</dd>
                            </div>
                        </dl>
                    </section>

                    <Separator />

                    <!-- Session Info -->
                    <section v-if="row.session">
                        <h4 class="mb-3 text-sm font-medium text-muted-foreground">
                            Session
                        </h4>
                        <dl class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <dt class="text-muted-foreground">Client IP</dt>
                                <dd class="font-mono">{{ row.session.clientIp ?? "\u2014" }}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-muted-foreground">ISP</dt>
                                <dd>{{ row.session.ipInfo?.org ?? "\u2014" }}</dd>
                            </div>
                            <div v-if="row.session.ipInfo?.city" class="flex justify-between">
                                <dt class="text-muted-foreground">Location</dt>
                                <dd>
                                    {{
                                        [row.session.ipInfo.city, row.session.ipInfo.region]
                                            .filter(Boolean)
                                            .join(", ")
                                    }}
                                </dd>
                            </div>
                            <div v-if="row.session.entityLookup?.entityName" class="flex justify-between">
                                <dt class="text-muted-foreground">Entity</dt>
                                <dd>{{ row.session.entityLookup.entityName }}</dd>
                            </div>
                        </dl>
                    </section>

                    <Separator v-if="row.survey" />

                    <!-- Survey Info -->
                    <section v-if="row.survey">
                        <h4 class="mb-3 text-sm font-medium text-muted-foreground">
                            Survey
                        </h4>
                        <dl class="space-y-2 text-sm">
                            <div v-if="row.survey.name" class="flex justify-between">
                                <dt class="text-muted-foreground">Name</dt>
                                <dd>{{ row.survey.name }}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-muted-foreground">Flow</dt>
                                <dd>
                                    <Badge variant="outline">{{ row.survey.flow }}</Badge>
                                </dd>
                            </div>
                            <div v-if="row.survey.schoolName" class="flex justify-between">
                                <dt class="text-muted-foreground">School</dt>
                                <dd>{{ row.survey.schoolName }}</dd>
                            </div>
                            <div v-if="row.survey.provider" class="flex justify-between">
                                <dt class="text-muted-foreground">Provider</dt>
                                <dd>{{ row.survey.provider }}</dd>
                            </div>
                        </dl>
                    </section>
                </div>
            </template>
        </SheetContent>
    </Sheet>
</template>
