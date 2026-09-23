/**
 * Workout Guide 姿势帧（CC BY-SA 4.0）。路径必须字面量，Metro 才能打包。
 */
import { exerciseIconKey, type Equipment } from '@fitness-coach/core';
import type { ImageSourcePropType } from 'react-native';

const BY_ID: Record<string, ImageSourcePropType> = {
  pushup: require('../assets/exercise-icons/pushup.png'),
  'bench-press': require('../assets/exercise-icons/bench-press.png'),
  'db-fly': require('../assets/exercise-icons/db-fly.png'),
  dip: require('../assets/exercise-icons/dip.png'),
  'incline-pushup': require('../assets/exercise-icons/incline-pushup.png'),
  'cable-crossover': require('../assets/exercise-icons/cable-crossover.png'),
  'chest-press-machine': require('../assets/exercise-icons/chest-press-machine.png'),
  ohp: require('../assets/exercise-icons/ohp.png'),
  'lateral-raise': require('../assets/exercise-icons/lateral-raise.png'),
  'front-raise': require('../assets/exercise-icons/front-raise.png'),
  'rear-delt-fly': require('../assets/exercise-icons/rear-delt-fly.png'),
  'face-pull': require('../assets/exercise-icons/face-pull.png'),
  'pike-pushup': require('../assets/exercise-icons/pike-pushup.png'),
  'db-row': require('../assets/exercise-icons/db-row.png'),
  pullup: require('../assets/exercise-icons/pullup.png'),
  'lat-pulldown': require('../assets/exercise-icons/lat-pulldown.png'),
  'seated-row': require('../assets/exercise-icons/seated-row.png'),
  superman: require('../assets/exercise-icons/superman.png'),
  'band-row': require('../assets/exercise-icons/band-row.png'),
  squat: require('../assets/exercise-icons/squat.png'),
  'glute-bridge': require('../assets/exercise-icons/glute-bridge.png'),
  lunge: require('../assets/exercise-icons/lunge.png'),
  rdl: require('../assets/exercise-icons/rdl.png'),
  'leg-press': require('../assets/exercise-icons/leg-press.png'),
  'calf-raise': require('../assets/exercise-icons/calf-raise.png'),
  'goblet-squat': require('../assets/exercise-icons/goblet-squat.png'),
  plank: require('../assets/exercise-icons/plank.png'),
  'dead-bug': require('../assets/exercise-icons/dead-bug.png'),
  'bird-dog': require('../assets/exercise-icons/bird-dog.png'),
  crunch: require('../assets/exercise-icons/crunch.png'),
  'side-plank': require('../assets/exercise-icons/side-plank.png'),
  'hanging-knee-raise': require('../assets/exercise-icons/hanging-knee-raise.png'),
};

export function exerciseIconSource(input: {
  catalogId?: string | null;
  equipment?: Equipment | null;
}): ImageSourcePropType {
  const key = exerciseIconKey(input);
  return BY_ID[key] ?? BY_ID.squat;
}
