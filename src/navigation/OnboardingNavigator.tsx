import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import { OnboardingProvider } from './OnboardingContext';
import WelcomeScreen from '../features/onboarding/WelcomeScreen';
import ZielScreen from '../features/onboarding/ZielScreen';
import KuecheScreen from '../features/onboarding/KuecheScreen';
import ZeitScreen from '../features/onboarding/ZeitScreen';
import KoennenScreen from '../features/onboarding/KoennenScreen';
import ErnährungAllergienenScreen from '../features/onboarding/AllergenSetupScreen';
import ConsentScreen from '../features/onboarding/ConsentScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <OnboardingProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen
          name="Ziel"
          component={ZielScreen}
          options={{ headerShown: true, title: 'Mein Ziel' }}
        />
        <Stack.Screen
          name="Kueche"
          component={KuecheScreen}
          options={{ headerShown: true, title: 'Meine Küche' }}
        />
        <Stack.Screen
          name="Zeit"
          component={ZeitScreen}
          options={{ headerShown: true, title: 'Meine Zeit' }}
        />
        <Stack.Screen
          name="Koennen"
          component={KoennenScreen}
          options={{ headerShown: true, title: 'Mein Können' }}
        />
        <Stack.Screen
          name="ErnährungAllergien"
          component={ErnährungAllergienenScreen}
          options={{ headerShown: true, title: 'Ernährung & Allergien' }}
        />
        <Stack.Screen
          name="ConsentScreen"
          component={ConsentScreen}
          options={{ headerShown: true, title: 'Datenschutz-Einwilligung' }}
        />
      </Stack.Navigator>
    </OnboardingProvider>
  );
}
