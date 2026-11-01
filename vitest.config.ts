import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false, // Run test suites sequentially to ensure clean database state
    testTimeout: 15000,
  },
});
