import { rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAddonOutDir } from './addon-path.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const { path: outDir, isAddonPath } = resolveAddonOutDir(projectRoot);

const log = (message) => {
  console.log(`[blendxweb2] ${message}`);
};

try {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
    log(
      `Removed existing build destination (${isAddonPath ? 'addon' : 'fallback'}): ${outDir}`,
    );
  } else {
    log(
      `No existing build destination to remove (${isAddonPath ? 'addon' : 'fallback'}): ${outDir}`,
    );
  }

  mkdirSync(outDir, { recursive: true });
  log(
    `Prepared build destination (${isAddonPath ? 'addon' : 'fallback'}): ${outDir}`,
  );
} catch (error) {
  console.warn(
    `[blendxweb2] Failed to clean build destination (${outDir}):`,
    error,
  );
  process.exitCode = 0;
}