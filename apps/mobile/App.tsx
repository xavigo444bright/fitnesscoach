import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@fitness-coach/ui';
import { hydrateAccount } from './src/accountStorage';
import RootNavigator from './src/navigation/RootNavigator';
import { hydrateWorkoutLog } from './src/workoutLogStorage';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    primary: colors.cta,
    text: colors.textPrimary,
    border: colors.border,
  },
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([hydrateWorkoutLog(), hydrateAccount()]).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <GestureHandlerRootView style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
