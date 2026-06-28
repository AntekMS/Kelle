import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from './types';
import FeedScreen from '../features/feed/FeedScreen';
import ShoppingListScreen from '../features/shopping/ShoppingListScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import DatenschutzScreen from '../features/legal/DatenschutzScreen';
import ImpressumScreen from '../features/legal/ImpressumScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Feed"
        component={FeedScreen}
        options={({ navigation }) => ({
          title: 'Küchen-Coach',
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              hitSlop={12}
              accessibilityLabel="Einstellungen"
            >
              <Text style={{ fontSize: 22 }}>⚙</Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: 'Einkaufsliste' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Einstellungen' }}
      />
      <Stack.Screen
        name="Datenschutz"
        component={DatenschutzScreen}
        options={{ title: 'Datenschutzerklärung' }}
      />
      <Stack.Screen
        name="Impressum"
        component={ImpressumScreen}
        options={{ title: 'Impressum' }}
      />
    </Stack.Navigator>
  );
}
