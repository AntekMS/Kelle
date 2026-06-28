import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Spectral_400Regular, Spectral_600SemiBold, Spectral_700Bold } from '@expo-google-fonts/spectral';
import { AppContext } from './src/navigation/AppContext';
import OnboardingNavigator from './src/navigation/OnboardingNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { hasGrantedConsent } from './src/store/profile-store';
import { colors } from './src/theme/colors';

SplashScreen.preventAutoHideAsync();

type AppState = 'loading' | 'onboarding' | 'main';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [fontsLoaded] = useFonts({ Spectral_400Regular, Spectral_600SemiBold, Spectral_700Bold });

  useEffect(() => {
    if (!fontsLoaded) return;
    hasGrantedConsent()
      .then((granted) => setAppState(granted ? 'main' : 'onboarding'))
      .catch(() => setAppState('onboarding'));
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded && appState !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appState]);

  const onConsentGranted = useCallback(() => setAppState('main'), []);
  const onDeleteProfile = useCallback(() => setAppState('onboarding'), []);

  if (!fontsLoaded || appState === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={{ onConsentGranted, onDeleteProfile }}>
        <NavigationContainer>
          {appState === 'onboarding' ? (
            <OnboardingNavigator />
          ) : (
            <MainNavigator />
          )}
        </NavigationContainer>
        <StatusBar style="dark" />
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
