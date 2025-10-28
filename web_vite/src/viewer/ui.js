import { setDomRefs, getDomRefs } from './state.js';

const formatTime = (value) => {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const showLoadingOverlay = () => {
  const { loadingOverlay } = getDomRefs();
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }
};

export const hideLoadingOverlay = () => {
  const { loadingOverlay } = getDomRefs();
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
};

export const setLoadingProgress = (value) => {
  const { loadingText } = getDomRefs();
  if (!loadingText) return;

  if (typeof value === 'number') {
    loadingText.textContent = value < 100 ? `Loading: ${value}%` : 'Processing...';
  } else if (value === 'start') {
    loadingText.textContent = 'Loading...';
  } else {
    loadingText.textContent = String(value);
  }
};

export const updateSceneInfo = (info) => {
  const { sceneTitle, sceneStats } = getDomRefs();
  if (!sceneTitle || !sceneStats) return;

  if (info) {
    sceneTitle.textContent = info.title || 'Blender Scene';
    sceneStats.textContent = `Objects: ${info.objects ?? '-'}`;
  } else {
    sceneTitle.textContent = 'Blender Scene';
    sceneStats.textContent = 'No scene info available';
  }
};

export const updateModelInfo = (gltf) => {
  const { modelVertices, modelFaces, modelMaterials } = getDomRefs();
  if (!modelVertices || !modelFaces || !modelMaterials) return;

  let totalVertices = 0;
  let totalFaces = 0;
  const materials = new Set();

  if (gltf && gltf.scene) {
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        if (child.geometry.attributes.position) {
          totalVertices += child.geometry.attributes.position.count;
        }
        if (child.geometry.index) {
          totalFaces += child.geometry.index.count / 3;
        }
        if (child.material) {
          materials.add(child.material.uuid);
        }
      }
    });
  }

  modelVertices.textContent = totalVertices ? totalVertices.toLocaleString() : '-';
  modelFaces.textContent = totalFaces ? Math.floor(totalFaces).toLocaleString() : '-';
  modelMaterials.textContent = materials.size || '-';
};

export const setModelFileSize = (bytes) => {
  const { modelFilesize } = getDomRefs();
  if (!modelFilesize || !bytes) return;

  const mb = bytes / (1024 * 1024);
  modelFilesize.textContent = `${mb.toFixed(2)} MB`;
};

export const showErrorMessage = (message) => {
  const { viewer } = getDomRefs();
  if (!viewer) return;

  const textDiv = document.createElement('div');
  textDiv.style.position = 'absolute';
  textDiv.style.top = '50%';
  textDiv.style.left = '50%';
  textDiv.style.transform = 'translate(-50%, -50%)';
  textDiv.style.color = '#ffffff';
  textDiv.style.background = 'rgba(0,0,0,0.7)';
  textDiv.style.padding = '20px';
  textDiv.style.borderRadius = '5px';
  textDiv.style.zIndex = '100';
  textDiv.textContent = message;
  viewer.appendChild(textDiv);
};

export const updateAnimationTimeDisplay = (time, duration) => {
  const { animationTime } = getDomRefs();
  if (!animationTime) return;

  if (!duration || duration <= 0) {
    animationTime.textContent = '0:00 / 0:00';
    return;
  }

  animationTime.textContent = `${formatTime(time)} / ${formatTime(duration)}`;
};

export const updateShadingStatus = (mode) => {
  const { shadingText, shadingStatus } = getDomRefs();
  if (!shadingText || !shadingStatus) return;

  shadingText.textContent = mode === 'flat' ? 'Flat Shading' : 'Smooth Shading';
  shadingStatus.textContent = 'ON';
  shadingStatus.className = 'text-green-500 text-xs';
};

export const updateNormalsStatus = (isOn) => {
  const { normalsStatus } = getDomRefs();
  if (!normalsStatus) return;

  normalsStatus.textContent = isOn ? 'ON' : 'OFF';
  normalsStatus.className = isOn ? 'text-green-500 text-xs' : 'text-neutral-500 text-xs';
};

export const updateLightingDisplay = (value) => {
  const { lightingValue } = getDomRefs();
  if (lightingValue) {
    lightingValue.textContent = value.toFixed(1);
  }
};

export const initializeUI = () => {
  const refs = {
    viewer: document.getElementById('viewer'),
    loadingOverlay: document.querySelector('#viewer .loading-overlay'),
    loadingText: document.getElementById('loading-percentage'),
    sceneTitle: document.getElementById('scene-title'),
    sceneStats: document.getElementById('scene-stats'),
    modelVertices: document.getElementById('model-vertices'),
    modelFaces: document.getElementById('model-faces'),
    modelMaterials: document.getElementById('model-materials'),
    modelFilesize: document.getElementById('model-filesize'),
    animationControls: document.getElementById('animation-controls'),
    animationSlider: document.getElementById('animation-slider'),
    animationTime: document.getElementById('animation-time'),
    shadingToggle: document.getElementById('shading-toggle'),
    shadingStatus: document.getElementById('shading-status'),
    shadingText: document.getElementById('shading-text'),
    normalsToggle: document.getElementById('show-normals'),
    normalsStatus: document.getElementById('normals-status'),
    wireframeToggle: document.getElementById('toggle-wireframe'),
    gridToggle: document.getElementById('toggle-grid'),
    lightsToggle: document.getElementById('toggle-lights'),
    resetCamera: document.getElementById('btn-reset-camera'),
    topView: document.getElementById('btn-top-view'),
    frontView: document.getElementById('btn-front-view'),
    sideView: document.getElementById('btn-side-view'),
    playButton: document.getElementById('btn-play'),
    pauseButton: document.getElementById('btn-pause'),
    stopButton: document.getElementById('btn-stop'),
    lightingSlider: document.getElementById('lighting-intensity'),
    lightingValue: document.getElementById('lighting-value'),
    toggleControls: document.getElementById('toggle-controls'),
    controlsPanel: document.getElementById('controls'),
  };

  setDomRefs(refs);

  if (refs.shadingToggle) {
    refs.shadingToggle.dataset.mode = refs.shadingToggle.dataset.mode || 'smooth';
    updateShadingStatus(refs.shadingToggle.dataset.mode);
  }

  updateNormalsStatus(false);

  if (refs.lightingSlider) {
    const initialValue = parseFloat(refs.lightingSlider.value || '1');
    updateLightingDisplay(initialValue);
  }
};