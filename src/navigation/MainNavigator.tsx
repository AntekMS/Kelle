import { Image, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type {
  MainTabParamList,
  FeedStackParamList,
  FavoritesStackParamList,
  ShoppingStackParamList,
  SettingsStackParamList,
} from './types';
import FeedScreen from '../features/feed/FeedScreen';
import ShoppingListScreen from '../features/shopping/ShoppingListScreen';
import FavoritesScreen from '../features/favorites/FavoritesScreen';
import DishDetailScreen from '../features/dish/DishDetailScreen';
import ProfilScreen from '../features/profil/ProfilScreen';
import ProfilEditScreen from '../features/profil/ProfilEditScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import DatenschutzScreen from '../features/legal/DatenschutzScreen';
import ImpressumScreen from '../features/legal/ImpressumScreen';
import ICON_IMAGES from '../components/icon-images';
import { colors } from '../theme/colors';

// Funktioniert in jedem Stack, der die Route 'Profil' registriert hat (#38).
function ProfileHeaderButton() {
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();
  return (
    <Pressable
      onPress={() => navigation.navigate('Profil')}
      hitSlop={12}
      accessibilityLabel="Mein Profil öffnen"
      accessibilityRole="button"
    >
      <Image
        source={ICON_IMAGES.profil}
        style={{ width: 24, height: 24, tintColor: colors.text, marginRight: 4 }}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const Tab = createBottomTabNavigator<MainTabParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const FavStack = createNativeStackNavigator<FavoritesStackParamList>();
const ShoppingStack = createNativeStackNavigator<ShoppingStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function FeedNavigator() {
  return (
    <FeedStack.Navigator>
      <FeedStack.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: 'Küchen-Coach', headerRight: () => <ProfileHeaderButton /> }}
      />
      <FeedStack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: 'Rezept' }} />
      <FeedStack.Screen name="Profil" component={ProfilScreen} options={{ title: 'Mein Profil' }} />
      <FeedStack.Screen name="ProfilBearbeiten" component={ProfilEditScreen} options={{ title: 'Profil bearbeiten' }} />
      <FeedStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Einstellungen' }} />
      <FeedStack.Screen name="Datenschutz" component={DatenschutzScreen} options={{ title: 'Datenschutzerklärung' }} />
      <FeedStack.Screen name="Impressum" component={ImpressumScreen} options={{ title: 'Impressum' }} />
    </FeedStack.Navigator>
  );
}

function FavoritesNavigator() {
  return (
    <FavStack.Navigator>
      <FavStack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favoriten', headerRight: () => <ProfileHeaderButton /> }}
      />
      <FavStack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: 'Rezept' }} />
      <FavStack.Screen name="Profil" component={ProfilScreen} options={{ title: 'Mein Profil' }} />
      <FavStack.Screen name="ProfilBearbeiten" component={ProfilEditScreen} options={{ title: 'Profil bearbeiten' }} />
      <FavStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Einstellungen' }} />
      <FavStack.Screen name="Datenschutz" component={DatenschutzScreen} options={{ title: 'Datenschutzerklärung' }} />
      <FavStack.Screen name="Impressum" component={ImpressumScreen} options={{ title: 'Impressum' }} />
    </FavStack.Navigator>
  );
}

function ShoppingNavigator() {
  return (
    <ShoppingStack.Navigator>
      <ShoppingStack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: 'Einkaufsliste', headerRight: () => <ProfileHeaderButton /> }}
      />
      <ShoppingStack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: 'Rezept' }} />
      <ShoppingStack.Screen name="Profil" component={ProfilScreen} options={{ title: 'Mein Profil' }} />
      <ShoppingStack.Screen name="ProfilBearbeiten" component={ProfilEditScreen} options={{ title: 'Profil bearbeiten' }} />
      <ShoppingStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Einstellungen' }} />
      <ShoppingStack.Screen name="Datenschutz" component={DatenschutzScreen} options={{ title: 'Datenschutzerklärung' }} />
      <ShoppingStack.Screen name="Impressum" component={ImpressumScreen} options={{ title: 'Impressum' }} />
    </ShoppingStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Einstellungen' }} />
      <SettingsStack.Screen name="Datenschutz" component={DatenschutzScreen} options={{ title: 'Datenschutzerklärung' }} />
      <SettingsStack.Screen name="Impressum" component={ImpressumScreen} options={{ title: 'Impressum' }} />
    </SettingsStack.Navigator>
  );
}

function TabIcon({ iconKey, color }: { iconKey: keyof typeof ICON_IMAGES; color: string }) {
  return <Image source={ICON_IMAGES[iconKey]} style={{ width: 24, height: 24, tintColor: color }} resizeMode="contain" />;
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedNavigator}
        options={{
          title: 'Entdecken',
          tabBarIcon: ({ color }) => <TabIcon iconKey="pan" color={color} />,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesNavigator}
        options={{
          title: 'Favoriten',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={focused ? ICON_IMAGES.heart_filled : ICON_IMAGES.heart_outline}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="ShoppingTab"
        component={ShoppingNavigator}
        options={{
          title: 'Einkauf',
          tabBarIcon: ({ color }) => <TabIcon iconKey="shopping" color={color} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{
          title: 'Einstellungen',
          tabBarIcon: ({ color }) => <TabIcon iconKey="settings" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
