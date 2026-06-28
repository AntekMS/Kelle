import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import SettingsScreen from '../features/settings/SettingsScreen';
import DatenschutzScreen from '../features/legal/DatenschutzScreen';
import ImpressumScreen from '../features/legal/ImpressumScreen';
import ICON_IMAGES from '../components/icon-images';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const FavStack = createNativeStackNavigator<FavoritesStackParamList>();
const ShoppingStack = createNativeStackNavigator<ShoppingStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function FeedNavigator() {
  return (
    <FeedStack.Navigator>
      <FeedStack.Screen name="Feed" component={FeedScreen} options={{ title: 'Küchen-Coach' }} />
      <FeedStack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: 'Rezept' }} />
    </FeedStack.Navigator>
  );
}

function FavoritesNavigator() {
  return (
    <FavStack.Navigator>
      <FavStack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favoriten' }} />
      <FavStack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: 'Rezept' }} />
    </FavStack.Navigator>
  );
}

function ShoppingNavigator() {
  return (
    <ShoppingStack.Navigator>
      <ShoppingStack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Einkaufsliste' }} />
      <ShoppingStack.Screen name="DishDetail" component={DishDetailScreen} options={{ title: 'Rezept' }} />
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
