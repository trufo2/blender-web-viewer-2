const state = {
  dom: {
    viewer: null,
    loadingOverlay: null,
    loadingText: null,
    sceneTitle: null,
    sceneStats: null,
    modelVertices: null,
    modelFaces: null,
    modelMaterials: null,
    modelFilesize: null,
    animationControls: null,
    animationSlider: null,
    animationTime: null,
    shadingToggle: null,
    shadingStatus: null,
    shadingText: null,
    normalsToggle: null,
    normalsStatus: null,
    wireframeToggle: null,
    gridToggle: null,
    lightsToggle: null,
    resetCamera: null,
    topView: null,
    frontView: null,
    sideView: null,
    playButton: null,
    pauseButton: null,
    stopButton: null,
    lightingSlider: null,
    lightingValue: null,
    toggleControls: null,
    controlsPanel: null,
  },
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  grid: null,
  mixer: null,
  clock: null,
  animationActions: [],
  animationDuration: 0,
  isPlaying: false,
  normalsHelper: null,
  modelRoot: null,
};

export const setDomRefs = (refs) => {
  state.dom = { ...state.dom, ...refs };
};

export const getDomRefs = () => state.dom;

export const setScene = (value) => {
  state.scene = value;
};

export const getScene = () => state.scene;

export const setCamera = (value) => {
  state.camera = value;
};

export const getCamera = () => state.camera;

export const setRenderer = (value) => {
  state.renderer = value;
};

export const getRenderer = () => state.renderer;

export const setControls = (value) => {
  state.controls = value;
};

export const getControls = () => state.controls;

export const setGrid = (value) => {
  state.grid = value;
};

export const getGrid = () => state.grid;

export const setMixer = (value) => {
  state.mixer = value;
};

export const getMixer = () => state.mixer;

export const setClock = (value) => {
  state.clock = value;
};

export const getClock = () => state.clock;

export const setAnimationActions = (actions) => {
  state.animationActions = actions;
};

export const getAnimationActions = () => state.animationActions;

export const setAnimationDuration = (duration) => {
  state.animationDuration = duration;
};

export const getAnimationDuration = () => state.animationDuration;

export const setIsPlaying = (value) => {
  state.isPlaying = value;
};

export const isPlaying = () => state.isPlaying;

export const setNormalsHelper = (helper) => {
  state.normalsHelper = helper;
};

export const getNormalsHelper = () => state.normalsHelper;

export const setModelRoot = (root) => {
  state.modelRoot = root;
};

export const getModelRoot = () => state.modelRoot;

export default state;