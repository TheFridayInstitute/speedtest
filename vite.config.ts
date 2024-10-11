import { defineConfig } from "vite";
import path from "path";

import VueMacros from "unplugin-vue-macros/vite";
import Vue from "@vitejs/plugin-vue";

import dts from "vite-plugin-dts";

import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const defaultOptions = {
    base: "./",
    css: {
        postcss: {
            plugins: [tailwind("./tailwind.config.ts"), autoprefixer()],
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
    VueMacros({
        betterDefine: false,
        plugins: {
            vue: Vue(),
        },
    }),
];

export default defineConfig((mode) => {
    if (mode.mode === "production") {
        return {
            ...defaultOptions,
            root: "./src/",
            optimizeDeps: {
                include: [],
            },
            build: {
                minify: true,
                sourcemap: true,
            },
            plugins: [...defaultPlugins, dts({ rollupTypes: true })],
        };
    } else if (mode.mode === "gh-pages") {
        return {
            ...defaultOptions,
            root: "./demo/cube/",
            build: {
                outDir: path.resolve(__dirname, "./dist/"),
                emptyOutDir: true,
                minify: true,
                sourcemap: true,
            },
            plugins: [...defaultPlugins],
        };
    } else {
        return {};
    }
});
