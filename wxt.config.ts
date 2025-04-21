import { nodePolyfills } from "vite-plugin-node-polyfills"
import { defineConfig } from 'wxt';

export default defineConfig({
    vite: () => ({
        plugins: [
            nodePolyfills({
                include: ["buffer", "crypto", "net", "path", "stream", "tty", "vm", "util"],
            }),
        ],
        define: {
            "process.env": JSON.stringify({
                LOG_LEVEL: "verbose",
                BB_WASM_PATH: "/barretenberg.wasm.gz",
            }),
        },
    }),
    manifest: {
        permissions: ["storage"],
        content_security_policy: {
            extension_pages: "script-src 'self' 'wasm-unsafe-eval'",
        },
        cross_origin_embedder_policy: {
            value: "require-corp",
        },
        cross_origin_opener_policy: {
            value: "same-origin",
        },
    }
});
