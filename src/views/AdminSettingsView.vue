<template>
    <div class="space-y-4">
        <UnderlineTabs
            :options="subTabs"
            :model-value="activeTab"
            class="text-base"
            @update:model-value="activeTab = $event"
        />

        <template v-if="activeTab === 'subnets'">
            <IPLookupManager
                :subnets="subnetsComposable.subnets.value"
                :total="subnetsComposable.total.value"
                :search="subnetsComposable.search.value"
                @update:search="subnetsComposable.search.value = $event; subnetsComposable.fetchSubnets()"
                @delete="subnetsComposable.deleteSubnet($event)"
                @add="subnetsComposable.addSubnet($event)"
                @sync="subnetsComposable.triggerSync()"
            />
        </template>

        <template v-else-if="activeTab === 'servers'">
            <AdminServerManager
                :servers="adminStore.servers"
                :is-loading="adminStore.serversLoading"
                @add="adminStore.registerServer($event)"
                @remove="adminStore.removeServer($event)"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { UnderlineTabs } from "@mkbabb/glass-ui";
import IPLookupManager from "@src/components/dashboard/IPLookupManager.vue";
import AdminServerManager from "@src/components/admin/AdminServerManager.vue";
import { useDashboardSubnets } from "@src/components/dashboard/composables/useDashboardSubnets";
import { useAdminDashboardDataStore } from "@src/stores/useAdminDashboardDataStore";

const activeTab = ref("subnets");

const subTabs = [
    { label: "Subnets", value: "subnets" },
    { label: "Servers", value: "servers" },
];

const subnetsComposable = useDashboardSubnets();
const adminStore = useAdminDashboardDataStore();

onMounted(() => {
    subnetsComposable.fetchSubnets();
    adminStore.fetchServers();
});
</script>
