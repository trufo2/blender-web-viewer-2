import { resolve, isAbsolute } from 'node:path';

const FALLBACK_RELATIVE = 'dist';

const normalizeForComparison = (value) => resolve(value).replace(/\\/g, '/').toLowerCase();

const isOutsideProjectRoot = (targetPath, projectRoot) => {
  const normalizedTarget = normalizeForComparison(targetPath);
  const normalizedRoot = normalizeForComparison(projectRoot);
  if (normalizedTarget === normalizedRoot) {
    return false;
  }
  return !normalizedTarget.startsWith(`${normalizedRoot}/`);
};

export const resolveAddonOutDir = (projectRoot) => {
  const fallbackPath = resolve(projectRoot, FALLBACK_RELATIVE);

  if (process.env.BLENDXWEB_USE_FALLBACK_DIST === 'true') {
    return {
      path: fallbackPath,
      isAddonPath: false,
    };
  }

  const customOutDir = process.env.BLENDXWEB_CUSTOM_OUTDIR;
  if (customOutDir) {
    const resolvedCustom = isAbsolute(customOutDir)
      ? customOutDir
      : resolve(projectRoot, customOutDir);

    return {
      path: resolvedCustom,
      isAddonPath: isOutsideProjectRoot(resolvedCustom, projectRoot),
    };
  }

  if (process.platform !== 'win32') {
    return {
      path: fallbackPath,
      isAddonPath: false,
    };
  }

  const appData = process.env.APPDATA;
  if (!appData) {
    return {
      path: fallbackPath,
      isAddonPath: false,
    };
  }

  const addonPath = resolve(
    appData,
    'Blender Foundation',
    'Blender',
    '5.0',
    'extensions',
    'user_default',
    'blendxweb2',
    'web',
  );

  return {
    path: addonPath,
    isAddonPath: true,
  };
};