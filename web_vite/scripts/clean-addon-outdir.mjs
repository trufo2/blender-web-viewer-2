import { rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAddonPaths } from './addon-path.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const { addonRoot, webPath, isAddonPath } = resolveAddonPaths(projectRoot);

const log = (message) => {
  console.log(`[blendxweb2] ${message}`);
};

try {
  if (existsSync(webPath)) {
    rmSync(webPath, { recursive: true, force: true });
    log(
      `Removed existing web build (${isAddonPath ? 'addon' : 'custom'}): ${webPath}`,
    );
  } else {
    log(
      `No existing web build to remove (${isAddonPath ? 'addon' : 'custom'}): ${webPath}`,
    );
  }

  mkdirSync(webPath, { recursive: true });
  log(
    `Prepared web build destination (${isAddonPath ? 'addon' : 'custom'}): ${webPath}`,
  );
} catch (error) {
  console.warn('[blendxweb2] Failed to clean web build destination:', error);
  process.exitCode = 0;
}