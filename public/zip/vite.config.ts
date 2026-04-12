import fs from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/** Copy Vite entry template so `index.html` is never the static shell while dev/build runs. */
function useViteIndexTemplate() {
  return {
    name: 'use-vite-index-template',
    buildStart() {
      const from = path.resolve(__dirname, 'index.vite.html');
      const to = path.resolve(__dirname, 'index.html');
      fs.copyFileSync(from, to);
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [useViteIndexTemplate(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // One JS bundle so opening dist/index.html from disk (file://) still loads; avoids chunk fetch/CORS issues.
      modulePreload: false,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
