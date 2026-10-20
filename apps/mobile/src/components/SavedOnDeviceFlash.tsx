import { colors, fontSize } from '@fitness-coach/ui';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { subscribeSavedToast } from '../screenRecord';

/** 离开训练后闪一次。0.5 秒，屏幕正中。 */
export default function SavedOnDeviceFlash() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeSavedToast((next, ms) => {
      setMessage(next);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), ms);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  bubble: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: {
    color: colors.textPrimary,
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
});
