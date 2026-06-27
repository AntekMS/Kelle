import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from './src/navigation/AppContext';
import OnboardingNavigator from './src/navigation/OnboardingNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { hasGrantedConsent } from './src/store/profile-store';

type AppState = 'loading' | 'onboarding' | 'main';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    hasGrantedConsent()
      .then((granted) => setAppState(granted ? 'main' : 'onboarding'))
      .catch(() => setAppState('onboarding'));
  }, []);

  const onConsentGranted = useCallback(() => setAppState('main'), []);

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={{ onConsentGranted }}>
        <NavigationContainer>
          {appState === 'loading' ? (
            <View style={styles.splash}>
              <ActivityIndicator size="large" color="#2D6A4F" />
            </View>
          ) : appState === 'onboarding' ? (
            <OnboardingNavigator />
          ) : (
            <MainNavigator />
          )}
        </NavigationContainer>
        <StatusBar style="auto" />
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAF8',
  },
});
