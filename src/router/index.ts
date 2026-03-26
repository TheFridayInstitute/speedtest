import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
    // ── Speedtest flow ───────────────────────────────────────────────
    {
        path: "/",
        name: "speedtest",
        component: () => import("@src/views/SpeedtestView.vue"),
    },
    {
        path: "/survey",
        name: "survey",
        component: () => import("@src/views/SurveyView.vue"),
    },
    {
        path: "/thankyou",
        name: "thankyou",
        component: () => import("@src/views/ThankYouView.vue"),
    },

    // ── Public dashboard ─────────────────────────────────────────────
    {
        path: "/dashboard",
        component: () => import("@src/layouts/PublicDashboardLayout.vue"),
        children: [
            {
                path: "",
                name: "dashboard",
                redirect: { name: "dashboard-map" },
            },
            {
                path: "map",
                name: "dashboard-map",
                component: () => import("@src/views/MapView.vue"),
            },
            {
                path: "charts",
                name: "dashboard-charts",
                component: () => import("@src/views/ChartsView.vue"),
            },
        ],
    },

    // ── Admin dashboard (5 tabs: Overview, Data, Charts, Map, Settings) ──
    {
        path: "/admin",
        component: () => import("@src/layouts/AdminDashboardLayout.vue"),
        children: [
            {
                path: "",
                name: "admin",
                redirect: { name: "admin-overview" },
            },
            {
                path: "overview",
                name: "admin-overview",
                component: () => import("@src/views/AdminOverviewView.vue"),
            },
            {
                path: "data",
                name: "admin-data",
                component: () => import("@src/views/AdminDataView.vue"),
            },
            {
                path: "charts",
                name: "admin-charts",
                component: () => import("@src/views/ChartsView.vue"),
            },
            {
                path: "map",
                name: "admin-map",
                component: () => import("@src/views/MapView.vue"),
            },
            {
                path: "settings",
                name: "admin-settings",
                component: () => import("@src/views/AdminSettingsView.vue"),
            },

            // ── Redirects for old routes ─────────────────────────────
            { path: "results", redirect: { name: "admin-data" } },
            { path: "sessions", redirect: { name: "admin-data" } },
            { path: "subnets", redirect: { name: "admin-settings" } },
            { path: "servers", redirect: { name: "admin-settings" } },
        ],
    },

    // ── Catch-all ────────────────────────────────────────────────────
    {
        path: "/:pathMatch(.*)*",
        redirect: "/",
    },
];

export const router = createRouter({
    history: createWebHistory(),
    routes,
});
