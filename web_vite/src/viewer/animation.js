import {
  getMixer,
  isPlaying,
  getAnimationDuration,
  setIsPlaying,
} from './state.js';
import { updateAnimationTimeDisplay, setAnimationSliderValue } from './ui.js';

const clampTime = (time, duration) => {
  const epsilon = 1e-4;
  if (time >= duration - epsilon) {
    return duration;
  }
  if (time < 0) {
    return 0;
  }
  return time;
};

export const tickAnimations = (deltaTime) => {
  const mixer = getMixer();
  if (!mixer || !isPlaying()) {
    return;
  }

  const duration = getAnimationDuration();
  if (!(duration > 0)) {
    return;
  }

  mixer.update(deltaTime);

  const rawTime = mixer.time;
  const clampedTime = clampTime(rawTime, duration);

  if (clampedTime >= duration) {
    mixer.setTime(duration);
    setIsPlaying(false);
  } else if (clampedTime !== rawTime) {
    mixer.setTime(clampedTime);
  }

  setAnimationSliderValue(clampedTime);

  updateAnimationTimeDisplay(clampedTime, duration);
};