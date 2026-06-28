import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Dish, Ingredient, UserProfile } from '../../types';
import type { FeedStackParamList } from '../../navigation/types';
import { DISHES } from '../../data/dishes';
import { INGREDIENTS } from '../../data/ingredients';
import {
  initDatabase,
  seedDishes,
  seedIngredients,
  getAllDishes,
  getAllIngredients,
  markDishCooked,
  getActiveDishIds,
  addDishToList,
  removeDishFromList,
} from '../../db/database';
import { fetchDishesFromCloud, fetchIngredientsFromCloud } from '../../db/cloud-catalog';
import { loadProfile, saveProfile } from '../../store/profile-store';
import { filterCompatibleDishes } from '../filter/allergen-filter';
import { rankDishes } from './scoring';
import DishCard from '../../components/DishCard';
import { colors } from '../../theme/colors';

function buildActiveIngredientIds(dishes: Dish[], listDishIds: Set<string>): ReadonlySet<string> {
  return new Set(
    dishes
      .filter((d) => listDishIds.has(d.id))
      .flatMap((d) => d.ingredients.map((di) => di.ingredient_id))
  );
}

type FeedState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      safeDishes: Dish[];
      rankedDishes: Dish[];
      ingredients: Ingredient[];
      ingredientMap: Map<string, Ingredient>;
      profile: UserProfile;
      listDishIds: Set<string>;
      activeIngredientIds: ReadonlySet<string>;
      usingOfflineData: boolean;
    };

export default function FeedScreen() {
  const [state, setState] = useState<FeedState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setState({ status: 'loading' });
    try {
      await initDatabase();

      let cloudDishes: Dish[] = [];
      let cloudIngredients: Ingredient[] = [];
      let usingOfflineData = false;
      try {
        [cloudDishes, cloudIngredients] = await Promise.all([
          fetchDishesFromCloud(),
          fetchIngredientsFromCloud(),
        ]);
        if (cloudDishes.length === 0) usingOfflineData = true;
      } catch {
        usingOfflineData = true;
      }

      const dishesToSeed = cloudDishes.length > 0 ? cloudDishes : DISHES;
      const ingredientsToSeed = cloudIngredients.length > 0 ? cloudIngredients : INGREDIENTS;

      await seedDishes(dishesToSeed);
      await seedIngredients(ingredientsToSeed);

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

      const ingredientMap = new Map(allIngredients.map((i) => [i.id, i]));
      const listSet = new Set(activeDishIds);
      const activeIngredientIds = buildActiveIngredientIds(allDishes, listSet);

      // Hard gate ALWAYS first — allergen, diet, equipment, time
      const safeDishes = filterCompatibleDishes(allDishes, profile);
      const rankedDishes = rankDishes(safeDishes, profile, allIngredients, activeIngredientIds);

      setState({
        status: 'ready',
        safeDishes,
        rankedDishes,
        ingredients: allIngredients,
        ingredientMap,
        profile,
        listDishIds: listSet,
        activeIngredientIds,
        usingOfflineData,
      });
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

  const refreshListState = useCallback(async () => {
    const activeDishIds = await getActiveDishIds();
    const listSet = new Set(activeDishIds);
    setState((prev) => {
      if (prev.status !== 'ready') return prev;
      const nextActiveIngredients = buildActiveIngredientIds(prev.safeDishes, listSet);
      const reranked = rankDishes(prev.safeDishes, prev.profile, prev.ingredients, nextActiveIngredients);
      return { ...prev, listDishIds: listSet, activeIngredientIds: nextActiveIngredients, rankedDishes: reranked };
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshListState();
    }, [refreshListState])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFeed(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadFeed]);

  async function handleMarkCooked(dishId: string) {
    if (state.status !== 'ready') return;
    const { safeDishes, ingredients, ingredientMap, profile, listDishIds, activeIngredientIds } = state;
    if (profile.cooked_dish_ids.includes(dishId)) return; // already cooked — keep idempotent

    await markDishCooked(dishId);
    const updated: UserProfile = {
      ...profile,
      cooked_dish_ids: [...profile.cooked_dish_ids, dishId],
      updated_at: new Date().toISOString(),
    };
    await saveProfile(updated);

    const rankedDishes = rankDishes(safeDishes, updated, ingredients, activeIngredientIds);
    setState({ ...state, rankedDishes, profile: updated, ingredientMap, listDishIds, activeIngredientIds });
  }

  async function handleToggleFavorite(dishId: string) {
    if (state.status !== 'ready') return;
    const { safeDishes, ingredients, ingredientMap, profile, listDishIds, activeIngredientIds } = state;

    const isFav = profile.favorites.includes(dishId);
    const favorites = isFav
      ? profile.favorites.filter((id) => id !== dishId)
      : [...profile.favorites, dishId];
    const updated: UserProfile = { ...profile, favorites, updated_at: new Date().toISOString() };
    await saveProfile(updated);

    const rankedDishes = rankDishes(safeDishes, updated, ingredients, activeIngredientIds);
    setState({ ...state, rankedDishes, profile: updated, ingredientMap, listDishIds, activeIngredientIds });
  }

  async function handleToggleShoppingList(dishId: string) {
    if (state.status !== 'ready') return;
    const { safeDishes, rankedDishes, ingredients, ingredientMap, profile, listDishIds } = state;

    const dish = rankedDishes.find((d) => d.id === dishId);
    if (!dish) return;

    const next = new Set(listDishIds);
    if (listDishIds.has(dishId)) {
      await removeDishFromList(dishId, ingredientMap);
      next.delete(dishId);
    } else {
      await addDishToList(dish, ingredientMap);
      next.add(dishId);
    }

    const nextActiveIngredients = buildActiveIngredientIds(safeDishes, next);
    const reranked = rankDishes(safeDishes, profile, ingredients, nextActiveIngredients);
    setState({ ...state, rankedDishes: reranked, listDishIds: next, activeIngredientIds: nextActiveIngredients });
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
        <Pressable style={styles.retryButton} onPress={() => loadFeed()} accessibilityLabel="Erneut laden">
          <Text style={styles.retryText}>Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  const { rankedDishes, profile, listDishIds, usingOfflineData, ingredientMap } = state;

  const listBanner =
    listDishIds.size > 0 ? (
      <Pressable
        style={styles.listBanner}
        onPress={() => navigation.navigate('ShoppingList')}
        accessibilityLabel={`Einkaufsliste öffnen, ${listDishIds.size} ${listDishIds.size === 1 ? 'Gericht' : 'Gerichte'}`}
      >
        <Text style={styles.listBannerText}>
          Einkaufsliste · {listDishIds.size} {listDishIds.size === 1 ? 'Gericht' : 'Gerichte'}
        </Text>
        <Text style={styles.listBannerArrow}>›</Text>
      </Pressable>
    ) : null;

  const offlineBanner = usingOfflineData ? (
    <View
      style={styles.offlineBanner}
      accessibilityLabel="Offline-Modus: lokale Rezepte werden angezeigt"
      accessibilityRole="text"
    >
      <Text style={styles.offlineBannerText}>Offline – lokale Rezepte</Text>
    </View>
  ) : null;

  const header = (listBanner || offlineBanner) ? (
    <View>
      {offlineBanner}
      {listBanner}
    </View>
  ) : null;

  return (
    <FlatList
      data={rankedDishes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <DishCard
          dish={item}
          isCooked={profile.cooked_dish_ids.includes(item.id)}
          isInShoppingList={listDishIds.has(item.id)}
          isFavorite={profile.favorites.includes(item.id)}
          onMarkCooked={handleMarkCooked}
          onToggleShoppingList={handleToggleShoppingList}
          onToggleFavorite={handleToggleFavorite}
          ingredientMap={ingredientMap}
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
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  list: { padding: 16, backgroundColor: colors.background },
  offlineBanner: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  offlineBannerText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  listBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 12,
  },
  listBannerText: { fontSize: 15, fontWeight: '600', color: colors.surface },
  listBannerArrow: { fontSize: 20, color: colors.primaryMuted, fontWeight: '300' },
  empty: { marginTop: 80, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
