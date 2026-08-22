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
    // These suites each spawn a real local Hardhat node on a fixed port and
    // do real chain I/O — running the files in parallel (Vitest's default)
    // proved unreliable on a resource-constrained machine (confirmed by
    // hand: fine standalone, intermittently timed out when run alongside
    // another integration file). Sequential file execution trades a few
    // seconds of wall-clock time for reliability, which matters more here.
    fileParallelism: false,
  },
});
