import {
  getDomRefs,
} from './state.js';

import {
  applyShadingMode,
  toggleNormals,
  toggleWireframe,
  toggleGrid,
  toggleLights,
  updateLightingIntensity,
  resetCameraToScene,
  setCameraPreset,
  playAnimations,
  pauseAnimations,
  stopAnimations,
  seekAnimation,
} from './actions.js';

export const registerControlHandlers = ({ hasAnimations }) => {
  const {
    shadingToggle,
    normalsToggle,
    wireframeToggle,
    gridToggle,
    lightsToggle,
    lightingSlider,
    lightingValue,
    resetCamera,
    topView,
    frontView,
    sideView,
    playButton,
    pauseButton,
    stopButton,
    animationSlider,
    animationControls,
    toggleControls,
    controlsPanel,
  } = getDomRefs();

  if (shadingToggle) {
    shadingToggle.addEventListener('click', () => {
      const currentMode = shadingToggle.dataset.mode || 'smooth';
      const nextMode = currentMode === 'smooth' ? 'flat' : 'smooth';
      shadingToggle.dataset.mode = nextMode;
      applyShadingMode(nextMode);
    });
  }

  if (normalsToggle) {
    normalsToggle.addEventListener('click', () => {
      const statusEl = getDomRefs().normalsStatus;
      const isOn = statusEl?.textContent === 'ON';
      toggleNormals(!isOn);
    });
  }

  if (wireframeToggle) {
    wireframeToggle.addEventListener('change', (event) => {
      toggleWireframe(event.target.checked);
    });
  }

  if (gridToggle) {
    gridToggle.addEventListener('change', (event) => {
      toggleGrid(event.target.checked);
    });
  }

  if (lightsToggle) {
    lightsToggle.addEventListener('change', (event) => {
      toggleLights(event.target.checked);
    });
  }

  if (lightingSlider && lightingValue) {
    lightingSlider.addEventListener('input', (event) => {
      const value = parseFloat(event.target.value);
      lightingValue.textContent = value.toFixed(1);
      updateLightingIntensity(value);
    });
  }

  if (resetCamera) {
    resetCamera.addEventListener('click', () => {
      resetCameraToScene();
    });
  }

  if (topView) {
    topView.addEventListener('click', () => {
      setCameraPreset({ x: 0, y: 10, z: 0 });
    });
  }

  if (frontView) {
    frontView.addEventListener('click', () => {
      setCameraPreset({ x: 0, y: 0, z: 10 });
    });
  }

  if (sideView) {
    sideView.addEventListener('click', () => {
      setCameraPreset({ x: 10, y: 0, z: 0 });
    });
  }

  if (hasAnimations && animationControls) {
    animationControls.style.display = '';
  } else if (animationControls) {
    animationControls.style.display = 'none';
  }

  if (playButton) {
    playButton.addEventListener('click', () => {
      playAnimations();
    });
  }

  if (pauseButton) {
    pauseButton.addEventListener('click', () => {
      pauseAnimations();
    });
  }

  if (stopButton) {
    stopButton.addEventListener('click', () => {
      stopAnimations();
    });
  }

  if (animationSlider) {
    animationSlider.addEventListener('input', (event) => {
      const time = parseFloat(event.target.value);
      seekAnimation(time);
    });
  }

  if (toggleControls && controlsPanel) {
    const handleToggle = () => {
      const willOpen = !controlsPanel.classList.contains('is-open');
      controlsPanel.classList.toggle('is-open', willOpen);
      console.log(`[BlendXWeb] controls ${willOpen ? 'opened' : 'hidden'}`);
    };

    toggleControls.addEventListener('click', handleToggle);
  }
};