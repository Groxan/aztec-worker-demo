import { nodePolyfills } from "vite-plugin-node-polyfills"
import { defineConfig } from 'wxt';

export default defineConfig({
    vite: () => ({
		headers: {
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin",
		},
        plugins: [
            nodePolyfills({
                include: ["buffer", "net", "path", "stream", "tty", "vm", "util"],
            }),
        ],
        define: {
            "process.browser": true,
            "process.env": JSON.stringify({
                LOG_LEVEL: "silent",
                BB_WASM_PATH: "/barretenberg.wasm.gz",
            }),
        },
        optimizeDeps: {
            exclude: ["@aztec/noir-acvm_js", "@aztec/noir-noirc_abi"],
        },
    }),
    manifest: {
        permissions: ["offscreen", "storage"],
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
