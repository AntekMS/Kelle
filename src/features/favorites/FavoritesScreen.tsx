import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { Dish, Ingredient, UserProfile } from '../../types';
import {
  initDatabase,
  getAllDishes,
  getAllIngredients,
  getActiveDishIds,
  markDishCooked,
  addDishToList,
  removeDishFromList,
} from '../../db/database';
import { loadProfile, saveProfile } from '../../store/profile-store';
import DishCard from '../../components/DishCard';
import { colors } from '../../theme/colors';

type FavState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      dishes: Dish[];
      profile: UserProfile;
      listDishIds: Set<string>;
      ingredientMap: Map<string, Ingredient>;
    };

export default function FavoritesScreen() {
  const [state, setState] = useState<FavState>({ status: 'loading' });
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      await initDatabase();
      const [allDishes, allIngredients, profile, activeDishIds] = await Promise.all([
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
        listDishIds: new Set(activeDishIds),
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

  async function handleMarkCooked(dishId: string) {
    if (state.status !== 'ready') return;
    await markDishCooked(dishId);
    const updated: UserProfile = {
      ...state.profile,
      cooked_dish_ids: [...state.profile.cooked_dish_ids, dishId],
      updated_at: new Date().toISOString(),
    };
    await saveProfile(updated);
    setState({ ...state, profile: updated });
  }

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

  async function handleToggleShoppingList(dishId: string) {
    if (state.status !== 'ready') return;
    const { dishes, ingredientMap, listDishIds } = state;
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish) return;

    const next = new Set(listDishIds);
    if (listDishIds.has(dishId)) {
      await removeDishFromList(dishId, ingredientMap);
      next.delete(dishId);
    } else {
      await addDishToList(dish, ingredientMap);
      next.add(dishId);
    }
    setState({ ...state, listDishIds: next });
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

  const { dishes, profile, listDishIds } = state;

  return (
    <FlatList
      data={dishes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      renderItem={({ item }) => (
        <DishCard
          dish={item}
          isCooked={profile.cooked_dish_ids.includes(item.id)}
          isInShoppingList={listDishIds.has(item.id)}
          isFavorite={profile.favorites.includes(item.id)}
          onMarkCooked={handleMarkCooked}
          onToggleShoppingList={handleToggleShoppingList}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Noch keine Favoriten.</Text>
          <Text style={styles.emptySubtitle}>
            Tippe auf das Herz-Icon bei einem Gericht, um es hier zu speichern.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  list: { padding: 16, backgroundColor: colors.background },
  empty: { marginTop: 80, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
