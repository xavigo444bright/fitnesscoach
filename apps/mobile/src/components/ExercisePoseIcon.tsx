/**
 * 动作姿势缩略图（T20）。图：Workout Guide / Everkinetic，CC BY-SA 4.0。
 */
import type { Equipment } from '@fitness-coach/core';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { exerciseIconSource } from '../exerciseIconAssets';

type Props = {
  catalogId?: string | null;
  equipment?: Equipment | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export default function ExercisePoseIcon({
  catalogId,
  equipment,
  size = 40,
  style,
}: Props) {
  return (
    <Image
      source={exerciseIconSource({ catalogId, equipment })}
      style={[styles.img, { width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const styles = StyleSheet.create({
  img: {
    width: 40,
    height: 40,
  },
});
