import * as THREE from 'three';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';
import {
  getScene,
  getCamera,
  getControls,
  getGrid,
  getDomRefs,
  getAnimationActions,
  getMixer,
  setIsPlaying,
  isPlaying,
  getAnimationDuration,
  setAnimationDuration,
  setAnimationActions,
  setMixer,
  setNormalsHelper,
  getNormalsHelper,
  getReferenceCameraPose,
} from './state.js';
import {
  updateAnimationTimeDisplay,
  setAnimationSliderValue,
  updateShadingStatus,
  updateNormalsStatus,
  updateLightingDisplay,
} from './ui.js';

const setAnimationLoopMode = (actions, mode) => {
  actions.forEach((action) => {
    if (mode === 'once') {
      action.setLoop(THREE.LoopOnce, 0);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    }
  });
};

export const applyShadingMode = (mode) => {
  const scene = getScene();
  if (!scene) return;

  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.flatShading = mode === 'flat';
      child.material.needsUpdate = true;
    }
  });

  updateShadingStatus(mode);
};

export const toggleNormals = (show) => {
  const scene = getScene();
  if (!scene) return;

  const currentHelper = getNormalsHelper();
  if (currentHelper) {
    scene.remove(currentHelper);
    setNormalsHelper(null);
  }

  if (!show) {
    updateNormalsStatus(false);
    return;
  }

  let helperCreated = false;
  scene.traverse((child) => {
    if (helperCreated) return;
    if (child.isMesh && child.geometry) {
      const helper = new VertexNormalsHelper(child, 0.1, 0x00ff00);
      scene.add(helper);
      setNormalsHelper(helper);
      helperCreated = true;
    }
  });

  updateNormalsStatus(helperCreated);
};

export const toggleWireframe = (enabled) => {
  const scene = getScene();
  if (!scene) return;

  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.wireframe = enabled;
    }
  });
};

export const toggleGrid = (visible) => {
  const grid = getGrid();
  if (grid) {
    grid.visible = visible;
  }
};

export const toggleLights = (visible) => {
  const scene = getScene();
  if (!scene) return;

  scene.traverse((child) => {
    if (child.isLight && !(child instanceof THREE.AmbientLight)) {
      child.visible = visible;
    }
  });
};

export const updateLightingIntensity = (intensity) => {
  const scene = getScene();
  if (!scene) return;

  scene.traverse((child) => {
    if (child.isLight) {
      const original = child.userData.originalIntensity || child.intensity;
      child.userData.originalIntensity = original;
      child.intensity = original * intensity;
    }
  });

  updateLightingDisplay(intensity);
};

export const resetCameraToScene = () => {
  const scene = getScene();
  if (!scene) return;

  const camera = getCamera();
  const controls = getControls();
  if (!camera) return;

  const referencePose = getReferenceCameraPose();

  if (referencePose) {
    const position = new THREE.Vector3().fromArray(referencePose.position);
    const quaternion = new THREE.Quaternion().fromArray(referencePose.quaternion);
    const target = new THREE.Vector3().fromArray(referencePose.target);

    camera.position.copy(position);
    camera.quaternion.copy(quaternion);

    if (referencePose.fov && camera.isPerspectiveCamera) {
      camera.fov = referencePose.fov;
      camera.updateProjectionMatrix();
    }

    if (controls) {
      controls.target.copy(target);
      controls.update();
    } else {
      camera.lookAt(target);
    }
    return;
  }

  const boundingBox = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  let distance = maxDim / (2 * Math.tan(fov / 2));
  distance = Math.max(distance, 1);

  if (controls) {
    const direction = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(center.clone().add(direction.multiplyScalar(distance * 1.5)));
    controls.target.copy(center);
    controls.update();
  } else {
    camera.position.set(center.x, center.y + distance, center.z + distance);
    camera.lookAt(center);
  }
};

export const setCameraPreset = ({ x = 0, y = 0, z = 0 }) => {
  const camera = getCamera();
  const controls = getControls();
  if (!camera) return;

  camera.position.set(x, y, z);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  } else {
    camera.lookAt(0, 0, 0);
  }
};

export const playAnimations = () => {
  const mixer = getMixer();
  const actions = getAnimationActions();
  if (!mixer || !actions.length) return;

  setAnimationLoopMode(actions, 'repeat');

  actions.forEach((action) => {
    action.paused = false;
    action.play();
  });
  setIsPlaying(true);
};

export const pauseAnimations = () => {
  const actions = getAnimationActions();
  if (!actions.length) return;

  setAnimationLoopMode(actions, 'once');

  actions.forEach((action) => {
    action.paused = true;
  });
  setIsPlaying(false);
};

export const stopAnimations = () => {
  const mixer = getMixer();
  const actions = getAnimationActions();
  if (!mixer || !actions.length) return;

  setAnimationLoopMode(actions, 'once');

  actions.forEach((action) => action.stop());
  mixer.setTime(0);
  setIsPlaying(false);
  updateAnimationTimeDisplay(0, getAnimationDuration());
};

export const seekAnimation = (time) => {
  const mixer = getMixer();
  const actions = getAnimationActions();
  if (!mixer || !actions.length) return;

  const duration = getAnimationDuration();
  const clampedTime = Math.max(0, duration > 0 ? Math.min(time, duration) : time);
  const wasPlaying = isPlaying();

  setAnimationLoopMode(actions, 'once');

  actions.forEach((action) => {
    action.paused = false;
    action.play();
    action.time = clampedTime;
  });

  mixer.setTime(clampedTime);
  mixer.update(0.000001);

  setAnimationSliderValue(clampedTime);
  updateAnimationTimeDisplay(clampedTime, duration);

  if (!wasPlaying) {
    actions.forEach((action) => {
      action.paused = true;
      action.time = clampedTime;
    });
  } else {
    setAnimationLoopMode(actions, 'repeat');
    actions.forEach((action) => {
      action.paused = false;
      action.play();
    });
  }

  setIsPlaying(wasPlaying);
};

export const initializeAnimations = (gltf, duration, mixer) => {
  if (!gltf.animations || !gltf.animations.length) return;

  const actions = gltf.animations.map((clip) => mixer.clipAction(clip));
  setAnimationActions(actions);
  setAnimationLoopMode(actions, 'repeat');

  const { animationSlider, animationSliderGlobal } = getDomRefs();
  if (animationSlider) {
    animationSlider.max = duration;
  }
  if (animationSliderGlobal) {
    animationSliderGlobal.max = duration;
  }

  setAnimationDuration(duration);
  setAnimationSliderValue(0);
  updateAnimationTimeDisplay(0, duration);

  actions[0].play();
  setIsPlaying(true);
  setMixer(mixer);
};