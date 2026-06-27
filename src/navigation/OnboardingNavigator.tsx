import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import WelcomeScreen from '../features/onboarding/WelcomeScreen';
import AllergenSetupScreen from '../features/onboarding/AllergenSetupScreen';
import ConsentScreen from '../features/onboarding/ConsentScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen
        name="AllergenSetup"
        component={AllergenSetupScreen}
        options={{ headerShown: true, title: 'Ernährungspräferenzen' }}
      />
      <Stack.Screen
        name="ConsentScreen"
        component={ConsentScreen}
        options={{ headerShown: true, title: 'Datenschutz-Einwilligung' }}
      />
    </Stack.Navigator>
  );
}
