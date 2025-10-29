import { resolve, isAbsolute } from 'node:path';

const normalizeForComparison = (value) => resolve(value).replace(/\\/g, '/').toLowerCase();

const isOutsideProjectRoot = (targetPath, projectRoot) => {
  const normalizedTarget = normalizeForComparison(targetPath);
  const normalizedRoot = normalizeForComparison(projectRoot);
  if (normalizedTarget === normalizedRoot) {
    return false;
  }
  return !normalizedTarget.startsWith(`${normalizedRoot}/`);
};

export const resolveAddonPaths = (projectRoot) => {
  const customOutDir = process.env.BLENDXWEB_CUSTOM_OUTDIR;

  if (customOutDir) {
    const addonRoot = isAbsolute(customOutDir)
      ? customOutDir
      : resolve(projectRoot, customOutDir);

    return {
      addonRoot,
      webPath: resolve(addonRoot, 'web'),
      isAddonPath: isOutsideProjectRoot(addonRoot, projectRoot),
    };
  }

  if (process.platform !== 'win32') {
    throw new Error(
      'blendxweb2 build requires BLENDXWEB_CUSTOM_OUTDIR on non-Windows platforms.',
    );
  }

  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error('blendxweb2 build requires APPDATA to locate the Blender addon path.');
  }

  const addonRoot = resolve(
    appData,
    'Blender Foundation',
    'Blender',
    '5.0',
    'extensions',
    'user_default',
    'blendxweb2',
  );

  return {
    addonRoot,
    webPath: resolve(addonRoot, 'web'),
    isAddonPath: true,
  };
};