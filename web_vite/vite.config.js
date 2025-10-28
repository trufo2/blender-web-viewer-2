import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { resolveAddonOutDir } from './scripts/addon-path.mjs';

const filePath = fileURLToPath(import.meta.url);
const dirPath = dirname(filePath);
const projectRoot = realpathSync(dirPath);

const { path: buildOutDir, isAddonPath } = resolveAddonOutDir(projectRoot);

export default defineConfig({
  root: projectRoot,
  publicDir: resolve(projectRoot, 'public'),
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
    },
    preserveSymlinks: true,
  },
  build: {
    outDir: buildOutDir,
    emptyOutDir: !isAddonPath,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});