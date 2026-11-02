import { defineConfig } from 'vitest/config';
import { ink } from './vite-plugin-ink.ts';

export default defineConfig({
  // Relative base so the build works from any path (e.g. GitHub Pages).
  base: './',
  plugins: [ink()],
  build: {
    // Keep sprites as files so pixel art is never re-encoded or inlined.
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['src/**/*.test.ts', 'content/**/*.test.ts'],
    environment: 'node',
    // The persistent module cache can't see Ink INCLUDEs, so edits to included
    // .ink files would run against a stale compile. Tests are fast without it.
    fsModuleCache: false,
  },
});
