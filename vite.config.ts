import { defineConfig } from "vite";
import path from "path";
import VueMacros from "unplugin-vue-macros/vite";
import Vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const defaultOptions = {
    base: "/",
    envDir: path.resolve(__dirname),
    css: {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler",
            },
        },
    },
    resolve: {
        alias: {
            "@src": path.resolve(__dirname, "src"),
            "@styles": path.resolve(__dirname, "styles"),
            "@components": path.resolve(__dirname, "src/@/components"),
            "@utils": path.resolve(__dirname, "src/utils"),
            "@assets": path.resolve(__dirname, "assets"),
        },
    },
};

const defaultPlugins = [
    tailwindcss(),
    VueMacros({
        betterDefine: false,
        plugins: {
            vue: Vue(),
        },
    }),
];

export default defineConfig((mode) => {
    // API proxy — in dev, proxy to the production API by default so we
    // see real data. Override with VITE_API_TARGET for local backend dev.
    const apiTarget =
        process.env.VITE_API_TARGET || "https://speedtest.mbabb.fi.ncsu.edu";
    const serverConfig = {
        proxy: {
            "/api": {
                target: apiTarget,
                changeOrigin: true,
                secure: true,
            },
        },
    };

    if (mode.mode === "production") {
        return {
            ...defaultOptions,
            root: "./src/",
            server: serverConfig,
            optimizeDeps: {
                include: [],
            },
            build: {
                minify: true,
                emptyOutDir: true,
                sourcemap: true,
                outDir: path.resolve(__dirname, "./dist/"),
                chunkSizeWarningLimit: 600,
                rollupOptions: {
                    output: {
                        manualChunks: {
                            "maplibre": ["maplibre-gl"],
                            "echarts": ["echarts", "vue-echarts"],
                            "h3": ["h3-js"],
                        },
                    },
                },
            },
            plugins: [
                ...defaultPlugins,
                viteStaticCopy({
                    targets: [
                        {
                            src: "utils/librespeed/*",
                            dest: "./assets/",
                        },
                    ],
                }),
            ],
        };
    } else {
        return {
            ...defaultOptions,
            root: "./src/",
            server: serverConfig,
            plugins: [
                ...defaultPlugins,
                viteStaticCopy({
                    targets: [
                        {
                            src: "utils/librespeed/*",
                            dest: "./assets/",
                        },
                    ],
                }),
            ],
        };
    }
});
