import {
  getMixer,
  isPlaying,
  getAnimationDuration,
  getDomRefs,
} from './state.js';
import { updateAnimationTimeDisplay } from './ui.js';

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

  const time = mixer.time % duration;
  const { animationSlider } = getDomRefs();
  if (animationSlider) {
    animationSlider.value = time;
  }

  updateAnimationTimeDisplay(time, duration);
};