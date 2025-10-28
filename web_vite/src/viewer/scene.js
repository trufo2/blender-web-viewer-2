import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import {
  setScene,
  setCamera,
  setRenderer,
  setControls,
  setGrid,
  setClock,
  getScene,
  getCamera,
  getRenderer,
  getControls,
  getDomRefs,
  getClock,
  setModelRoot,
  setIsPlaying,
} from './state.js';

import {
  initializeUI,
  showLoadingOverlay,
  hideLoadingOverlay,
  setLoadingProgress,
  updateSceneInfo,
  updateModelInfo,
  setModelFileSize,
  showErrorMessage,
  updateAnimationTimeDisplay,
} from './ui.js';

import { initializeAnimations } from './actions.js';
import { registerControlHandlers } from './controls.js';
import { tickAnimations } from './animation.js';

const createRenderer = (container) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
};

const createCamera = (container) => {
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000,
  );
  camera.position.set(5, 5, 5);
  return camera;
};

const createLighting = (scene) => {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(5, 10, 7.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 50;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-5, 5, 5);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
  backLight.position.set(0, 5, -5);
  scene.add(backLight);

  const leftLight = new THREE.DirectionalLight(0xffffff, 0.4);
  leftLight.position.set(-10, 3, 0);
  scene.add(leftLight);

  const rightLight = new THREE.DirectionalLight(0xffffff, 0.4);
  rightLight.position.set(10, 3, 0);
  scene.add(rightLight);

  scene.traverse((child) => {
    if (child.isLight && child instanceof THREE.DirectionalLight) {
      child.userData.originalIntensity = child.intensity;
    }
  });

  ambientLight.userData.originalIntensity = ambientLight.intensity;
};

const initScene = () => {
  const { viewer } = getDomRefs();
  if (!viewer) {
    throw new Error('Viewer container not found');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  const camera = createCamera(viewer);
  const renderer = createRenderer(viewer);

  let controls;
  try {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
  } catch (error) {
    console.error('Error creating OrbitControls:', error);
  }

  const grid = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
  scene.add(grid);

  createLighting(scene);

  const clock = new THREE.Clock();

  setScene(scene);
  setCamera(camera);
  setRenderer(renderer);
  setControls(controls);
  setGrid(grid);
  setClock(clock);

  window.addEventListener('resize', handleResize);

  animate();
};

const handleResize = () => {
  const { viewer } = getDomRefs();
  const scene = getScene();
  const camera = getCamera();
  const renderer = getRenderer();
  if (!viewer || !scene || !camera || !renderer) {
    return;
  }

  camera.aspect = viewer.clientWidth / viewer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
};

const loadSceneInfo = async () => {
  try {
    const response = await fetch('scene_info.json');
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    updateSceneInfo(data);

    if (!data.has_animations) {
      const { animationControls } = getDomRefs();
      if (animationControls) {
        animationControls.style.display = 'none';
      }
    }

    return data;
  } catch (error) {
    console.warn('Unable to load scene_info.json:', error);
    updateSceneInfo(null);
    const { animationControls } = getDomRefs();
    if (animationControls) {
      animationControls.style.display = '';
    }
    return null;
  }
};

const setupDracoLoader = () => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('draco/');
  dracoLoader.setDecoderConfig({ type: 'js' });
  return dracoLoader;
};

const centerCameraOnModel = (model) => {
  const camera = getCamera();
  const controls = getControls();
  if (!camera) {
    return;
  }

  const boundingBox = new THREE.Box3().setFromObject(model);
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

const loadModel = async () => {
  showLoadingOverlay();
  setLoadingProgress('start');

  const loader = new GLTFLoader();
  try {
    const dracoLoader = setupDracoLoader();
    loader.setDRACOLoader(dracoLoader);
  } catch (error) {
    console.warn('Draco loader setup failed, continuing without Draco support:', error);
  }

  try {
    const response = await fetch('scene.glb');
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const fileSize = response.headers.get('content-length');
    if (fileSize) {
      setModelFileSize(parseInt(fileSize, 10));
    }
  } catch (error) {
    console.error('Failed to fetch scene.glb:', error);
  }

  return new Promise((resolve, reject) => {
    loader.load(
      'scene.glb',
      (gltf) => {
        setLoadingProgress(100);
        const scene = getScene();
        if (!scene) {
          reject(new Error('Scene not initialized'));
          return;
        }

        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(gltf.scene);
        setModelRoot(gltf.scene);
        updateModelInfo(gltf);
        centerCameraOnModel(gltf.scene);

        const { animationControls, animationSlider } = getDomRefs();

        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          initializeAnimations(gltf, gltf.animations[0].duration, mixer);

          if (animationControls) {
            animationControls.style.display = '';
          }
        } else {
          setIsPlaying(false);
          updateAnimationTimeDisplay(0, 0);
          if (animationControls) {
            animationControls.style.display = 'none';
          }
          if (animationSlider) {
            animationSlider.max = 0;
            animationSlider.value = 0;
          }
        }

        hideLoadingOverlay();
        resolve(gltf);
      },
      (xhr) => {
        if (xhr.total) {
          const percent = Math.floor((xhr.loaded / xhr.total) * 100);
          setLoadingProgress(percent);
        }
      },
      (error) => {
        console.error('Error loading GLB:', error);
        hideLoadingOverlay();
        showErrorMessage('Error loading 3D model. Check console for details.');
        reject(error);
      },
    );
  });
};

const animate = () => {
  requestAnimationFrame(animate);

  const controls = getControls();
  if (controls && controls.update) {
    controls.update();
  }

  const clock = getClock();
  const delta = clock ? clock.getDelta() : 0;
  tickAnimations(delta);

  const scene = getScene();
  const camera = getCamera();
  const renderer = getRenderer();
  if (scene && camera && renderer) {
    renderer.render(scene, camera);
  }
};

export const setupViewer = async () => {
  initializeUI();
  initScene();

  const sceneInfo = await loadSceneInfo();
  registerControlHandlers({
    hasAnimations: sceneInfo?.has_animations ?? false,
  });

  try {
    await loadModel();
  } catch (error) {
    console.error('Model load failed:', error);
  }
};