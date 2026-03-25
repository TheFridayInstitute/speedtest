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
    // API proxy — needed in ALL modes when running `vite dev`
    const serverConfig = {
        proxy: {
            "/api": {
                target: "http://localhost:3200",
                changeOrigin: true,
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
