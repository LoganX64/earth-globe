import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      // Without this, a production stack trace in a user's console is
      // unreadable — the bundle is minified and un-mapped, so an error points
      // at a single obfuscated line. The sources are already public in the
      // repository, so this discloses nothing new.
      sourcemap: true,
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
          embed: path.resolve(import.meta.dirname, 'embed.html'),
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
            if (
              id.includes('node_modules/d3-geo') ||
              id.includes('node_modules/topojson-client') ||
              id.includes('world-atlas')
            ) {
              return 'geo-engine';
            }
            if (id.includes('india-') && id.endsWith('.json')) {
              return 'india-cartography';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
