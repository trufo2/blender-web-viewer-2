import { copyFileSync, existsSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAddonPaths } from './addon-path.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const repoRoot = resolve(projectRoot, '..');

const assets = [
  {
    source: resolve(repoRoot, '__init__.py'),
    destination: (outDir) => resolve(outDir, '__init__.py'),
    type: 'file',
  },
  {
    source: resolve(repoRoot, 'blender_manifest.toml'),
    destination: (outDir) => resolve(outDir, 'blender_manifest.toml'),
    type: 'file',
  },
  {
    source: resolve(repoRoot, 'image.png'),
    destination: (outDir) => resolve(outDir, 'image.png'),
    type: 'file',
  },
  {
    source: resolve(repoRoot, 'README.md'),
    destination: (outDir) => resolve(outDir, 'README.md'),
    type: 'file',
  },
  {
    source: resolve(repoRoot, 'server'),
    destination: (outDir) => resolve(outDir, 'server'),
    type: 'directory',
  },
];

const log = (message) => {
  console.log(`[blendxweb2] ${message}`);
};

const ensureExists = (path) => {
  if (!existsSync(path)) {
    throw new Error(`Required asset missing: ${path}`);
  }
};

try {
  const { addonRoot, isAddonPath } = resolveAddonPaths(projectRoot);
  
    assets.forEach(({ source, destination, type }) => {
      ensureExists(source);
      const targetPath = destination(addonRoot);

    if (type === 'directory') {
      rmSync(targetPath, { recursive: true, force: true });
      cpSync(source, targetPath, { recursive: true });
      log(
        `Copied directory ${source} -> ${targetPath} (${isAddonPath ? 'addon' : 'custom'})`,
      );
    } else {
      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(source, targetPath);
      log(
        `Copied file ${source} -> ${targetPath} (${isAddonPath ? 'addon' : 'custom'})`,
      );
    }
  });
} catch (error) {
  console.warn('[blendxweb2] Failed to copy addon assets:', error);
  process.exitCode = 1;
}