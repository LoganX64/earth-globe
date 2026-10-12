import { defineConfig } from 'vitest/config';

// Standalone config, separate from vite.config.ts: the app build pulls in the
// React + Tailwind plugins and a dual-entry rollup setup that a unit-test run
// neither needs nor wants. Everything under test here is pure logic, so the
// default node environment is enough — no jsdom, no DOM shims.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});