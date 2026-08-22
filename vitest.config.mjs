import { defineConfig } from "vitest/config";

// Root-level config for the top-level integration/security suites (P6-06+)
// that span more than one package (server + smart_contract). Per-package
// suites keep their own vitest configs under server/ and vite-project/.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.js"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
