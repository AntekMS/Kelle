import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Dish, Ingredient, UserProfile } from '../../types';
import type { FavoritesStackParamList } from '../../navigation/types';
import {
  initDatabase,
  getAllDishes,
  getAllIngredients,
  getActiveDishIds,
} from '../../db/database';
import { loadProfile, saveProfile } from '../../store/profile-store';
import DishGridCard from '../../components/DishGridCard';
import ICON_IMAGES from '../../components/icon-images';
import { colors } from '../../theme/colors';

/** Teilt eine Gericht-Liste in Zeilen à 2 für das Grid-Layout. */
function chunkPairs(dishes: Dish[]): Dish[][] {
  const rows: Dish[][] = [];
  for (let i = 0; i < dishes.length; i += 2) rows.push(dishes.slice(i, i + 2));
  return rows;
}

type FavState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      dishes: Dish[];
      profile: UserProfile;
      ingredientMap: Map<string, Ingredient>;
    };

export default function FavoritesScreen() {
  const [state, setState] = useState<FavState>({ status: 'loading' });
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<FavoritesStackParamList>>();

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      await initDatabase();
      const [allDishes, allIngredients, profile] = await Promise.all([
        getAllDishes(),
        getAllIngredients(),
        loadProfile(),
        getActiveDishIds(),
      ]);

      if (!profile) {
        setState({ status: 'error', message: 'Profil konnte nicht geladen werden.' });
        return;
      }

      setState({
        status: 'ready',
        dishes: allDishes.filter((d) => profile.favorites.includes(d.id)),
        profile,
        ingredientMap: new Map(allIngredients.map((i) => [i.id, i])),
      });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Unbekannter Fehler.' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleToggleFavorite(dishId: string) {
    if (state.status !== 'ready') return;
    const { profile, dishes } = state;
    const isFav = profile.favorites.includes(dishId);
    const favorites = isFav
      ? profile.favorites.filter((id) => id !== dishId)
      : [...profile.favorites, dishId];
    const updated: UserProfile = { ...profile, favorites, updated_at: new Date().toISOString() };
    await saveProfile(updated);
    setState({
      ...state,
      profile: updated,
      dishes: isFav ? dishes.filter((d) => d.id !== dishId) : dishes,
    });
  }

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{state.message}</Text>
        <Pressable style={styles.retryButton} onPress={load} accessibilityLabel="Erneut versuchen">
          <Text style={styles.retryText}>Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  const { dishes, profile, ingredientMap } = state;

  return (
    <FlatList<Dish[]>
      data={chunkPairs(dishes)}
      keyExtractor={(pair) => pair.map((d) => d.id).join('-')}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }, dishes.length === 0 && styles.listEmpty]}
      renderItem={({ item: pair }) => (
        <View style={styles.row}>
          <DishGridCard
            dish={pair[0]}
            isCooked={profile.cooked_dish_ids.includes(pair[0].id)}
            isFavorite={profile.favorites.includes(pair[0].id)}
            onToggleFavorite={handleToggleFavorite}
            onPress={(dishId) => navigation.navigate('DishDetail', { dishId })}
            ingredientMap={ingredientMap}
          />
          {pair[1] ? (
            <DishGridCard
              dish={pair[1]}
              isCooked={profile.cooked_dish_ids.includes(pair[1].id)}
              isFavorite={profile.favorites.includes(pair[1].id)}
              onToggleFavorite={handleToggleFavorite}
              onPress={(dishId) => navigation.navigate('DishDetail', { dishId })}
              ingredientMap={ingredientMap}
            />
          ) : (
            <View style={styles.gridSpacer} />
          )}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Image source={ICON_IMAGES.heart_outline} style={styles.emptyIcon} resizeMode="contain" />
          <Text style={styles.emptyTitle}>Noch keine Favoriten</Text>
          <Text style={styles.emptySubtitle}>
            Tippe auf das Herz bei einem Gericht, um es hier zu speichern.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  list: { padding: 16, backgroundColor: colors.background },
  listEmpty: { flexGrow: 1 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridSpacer: { flex: 1 },
  empty: { marginTop: 80, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  emptyIcon: { width: 52, height: 52, tintColor: colors.primaryMuted, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
