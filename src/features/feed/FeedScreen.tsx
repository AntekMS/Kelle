import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Dish, Ingredient, UserProfile } from '../../types';
import { DISHES } from '../../data/dishes';
import { INGREDIENTS } from '../../data/ingredients';
import {
  initDatabase,
  seedDishes,
  seedIngredients,
  getAllDishes,
  getAllIngredients,
  markDishCooked,
} from '../../db/database';
import { fetchDishesFromCloud, fetchIngredientsFromCloud } from '../../db/cloud-catalog';
import { loadProfile, saveProfile } from '../../store/profile-store';
import { filterCompatibleDishes } from '../filter/allergen-filter';
import { rankDishes } from './scoring';
import DishCard from '../../components/DishCard';

type FeedState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      safeDishes: Dish[];
      rankedDishes: Dish[];
      ingredients: Ingredient[];
      profile: UserProfile;
    };

export default function FeedScreen() {
  const [state, setState] = useState<FeedState>({ status: 'loading' });
  const insets = useSafeAreaInsets();

  const loadFeed = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      await initDatabase();

      // Fetch from Supabase cloud catalog; fall back to bundled data if unavailable
      let cloudDishes: Dish[] = [];
      let cloudIngredients: Ingredient[] = [];
      try {
        [cloudDishes, cloudIngredients] = await Promise.all([
          fetchDishesFromCloud(),
          fetchIngredientsFromCloud(),
        ]);
      } catch {
        // Supabase unreachable — use bundled seed data
      }

      const dishesToSeed = cloudDishes.length > 0 ? cloudDishes : DISHES;
      const ingredientsToSeed = cloudIngredients.length > 0 ? cloudIngredients : INGREDIENTS;

      await Promise.all([
        seedDishes(dishesToSeed),
        seedIngredients(ingredientsToSeed),
      ]);

      const [allDishes, allIngredients, profile] = await Promise.all([
        getAllDishes(),
        getAllIngredients(),
        loadProfile(),
      ]);

      if (!profile) {
        setState({ status: 'error', message: 'Profil konnte nicht geladen werden.' });
        return;
      }

      // Hard gate ALWAYS first — allergen, diet, equipment, time
      const safeDishes = filterCompatibleDishes(allDishes, profile);
      const rankedDishes = rankDishes(safeDishes, profile, allIngredients);

      setState({ status: 'ready', safeDishes, rankedDishes, ingredients: allIngredients, profile });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unbekannter Fehler.',
      });
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function handleMarkCooked(dishId: string) {
    if (state.status !== 'ready') return;
    const { safeDishes, ingredients, profile } = state;

    await markDishCooked(dishId);

    const updated: UserProfile = {
      ...profile,
      cooked_dish_ids: [...profile.cooked_dish_ids, dishId],
      updated_at: new Date().toISOString(),
    };
    await saveProfile(updated);

    // Re-rank in memory — filter result unchanged
    const rankedDishes = rankDishes(safeDishes, updated, ingredients);
    setState({ ...state, rankedDishes, profile: updated });
  }

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{state.message}</Text>
        <Pressable style={styles.retryButton} onPress={loadFeed}>
          <Text style={styles.retryText}>Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  const { rankedDishes, profile } = state;

  return (
    <FlatList
      data={rankedDishes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      renderItem={({ item }) => (
        <DishCard
          dish={item}
          isCooked={profile.cooked_dish_ids.includes(item.id)}
          onMarkCooked={handleMarkCooked}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Keine Gerichte verfügbar.</Text>
          <Text style={styles.emptySubtitle}>
            Alle Gerichte wurden aufgrund deiner Einstellungen gefiltert.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#7A2C2C', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#2D6A4F', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  list: { padding: 16, backgroundColor: '#F9FAF8' },
  empty: { marginTop: 80, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#3A4E3A', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#6B7F6B', textAlign: 'center', lineHeight: 21 },
});
