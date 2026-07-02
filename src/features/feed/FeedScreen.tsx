import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  ActivityIndicator,
  Pressable,
  Image,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import NetInfo from '@react-native-community/netinfo';
import type { Dish, Ingredient, UserProfile } from '../../types';
import type { FeedStackParamList, MainTabParamList } from '../../navigation/types';
import { DISHES } from '../../data/dishes';
import { INGREDIENTS } from '../../data/ingredients';
import {
  initDatabase,
  seedDishes,
  seedIngredients,
  getAllDishes,
  getAllIngredients,
  getActiveDishIds,
} from '../../db/database';
import { fetchDishesFromCloud, fetchIngredientsFromCloud, hardenCloudDishes } from '../../db/cloud-catalog';
import { loadProfile, saveProfile } from '../../store/profile-store';
import { filterCompatibleDishes } from '../filter/allergen-filter';
import { rankDishes } from './scoring';
import { partitionByCooked, stabilizeRanking } from './feed-sections';
import DishGridCard from '../../components/DishGridCard';
import FeaturedDishCard from '../../components/FeaturedDishCard';
import ICON_IMAGES from '../../components/icon-images';
import { colors } from '../../theme/colors';

function buildActiveIngredientIds(dishes: Dish[], listDishIds: Set<string>): ReadonlySet<string> {
  return new Set(
    dishes
      .filter((d) => listDishIds.has(d.id))
      .flatMap((d) => d.ingredients.map((di) => di.ingredient_id))
  );
}

/** Teilt eine Gericht-Liste in Zeilen à 2 für das Grid-Layout. */
function chunkPairs(dishes: Dish[]): Dish[][] {
  const rows: Dish[][] = [];
  for (let i = 0; i < dishes.length; i += 2) rows.push(dishes.slice(i, i + 2));
  return rows;
}

type FeedState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      allDishes: Dish[];
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
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setState({ status: 'loading' });
    try {
      await initDatabase();

      // Echter Netzwerk-Status: offline erkennen wir auch, wenn Supabase (fälschlich) antwortet.
      const net = await NetInfo.fetch();
      const isOffline = net.isConnected === false;

      let cloudDishes: Dish[] = [];
      let cloudIngredients: Ingredient[] = [];
      if (!isOffline) {
        try {
          [cloudDishes, cloudIngredients] = await Promise.all([
            fetchDishesFromCloud(),
            fetchIngredientsFromCloud(),
          ]);
        } catch {
          // Fallback unten über cloudUsable
        }
      }

      // Cloud-Daten nur als Ganzes übernehmen — eine Teilantwort (Gerichte ohne
      // Zutaten oder umgekehrt) würde Cloud-Gerichte mit Bundled-Zutaten mischen.
      const hardenedDishes =
        cloudDishes.length > 0 && cloudIngredients.length > 0
          ? hardenCloudDishes(cloudDishes, cloudIngredients)
          : [];
      const cloudUsable = hardenedDishes.length > 0;
      const usingOfflineData = !cloudUsable;

      if (cloudUsable) {
        await seedDishes(hardenedDishes);
        await seedIngredients(cloudIngredients);
      } else if ((await getAllDishes()).length === 0) {
        // First-Run ohne Cloud: Bundled-Snapshot seeden. Einen bereits gefüllten
        // (ggf. neueren) Cloud-Cache nie mit dem Bundle überschreiben.
        await seedDishes(DISHES);
        await seedIngredients(INGREDIENTS);
      }

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
        allDishes,
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

  // Beim Zurückkehren (z. B. aus DishDetail) Profil + Einkaufsliste neu laden,
  // damit dort markierte "gekocht"/Favoriten/Listen-Änderungen im Feed erscheinen.
  // Die Reihenfolge bleibt dabei stabil (#44) — neu sortiert wird nur bei
  // loadFeed()/Pull-to-Refresh.
  const refreshOnFocus = useCallback(async () => {
    const [profile, activeDishIds] = await Promise.all([loadProfile(), getActiveDishIds()]);
    const listSet = new Set(activeDishIds);
    setState((prev) => {
      if (prev.status !== 'ready' || !profile) return prev;
      // Harten Filter (Allergene/Diät/Equipment/Zeit) mit dem frischen Profil
      // IMMER neu anwenden — Stabilität gilt nur für die Sortierung, nie für
      // das Herausfiltern.
      const safeDishes = filterCompatibleDishes(prev.allDishes, profile);
      const nextActiveIngredients = buildActiveIngredientIds(prev.allDishes, listSet);
      const reranked = rankDishes(safeDishes, profile, prev.ingredients, nextActiveIngredients);
      return {
        ...prev,
        profile,
        safeDishes,
        listDishIds: listSet,
        activeIngredientIds: nextActiveIngredients,
        rankedDishes: stabilizeRanking(prev.rankedDishes, reranked),
      };
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshOnFocus();
    }, [refreshOnFocus])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFeed(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadFeed]);

  async function handleToggleFavorite(dishId: string) {
    if (state.status !== 'ready') return;
    const { profile } = state;

    const isFav = profile.favorites.includes(dishId);
    const favorites = isFav
      ? profile.favorites.filter((id) => id !== dishId)
      : [...profile.favorites, dishId];
    const updated: UserProfile = { ...profile, favorites, updated_at: new Date().toISOString() };
    await saveProfile(updated);

    // Kein Re-Ranking hier (#44): der favBonus würde das Gericht sofort
    // hochspringen lassen. Neue Reihenfolge erst bei Pull-to-Refresh.
    setState({ ...state, profile: updated });
  }

  // Hooks müssen vor den frühen Returns laufen (Rules of Hooks) — daher hier oben,
  // mit Status-Guard im Memo statt nach dem loading/error-Return.
  const query = searchQuery.trim().toLowerCase();
  const { featured, sections } = useMemo(() => {
    if (state.status !== 'ready') return { featured: null as Dish | null, sections: [] as { title: string; data: Dish[][] }[] };
    const visibleDishes = query
      ? state.rankedDishes.filter((d) => d.name.toLowerCase().includes(query))
      : state.rankedDishes;
    const { forYou, cooked } = partitionByCooked(visibleDishes, state.profile.cooked_dish_ids);

    // Featured nur ohne aktive Suche und wenn es Empfehlungen gibt.
    const useFeatured = !query && forYou.length > 0;
    const featuredDish = useFeatured ? forYou[0] : null;
    const forYouGrid = useFeatured ? forYou.slice(1) : forYou;

    const result: { title: string; data: Dish[][] }[] = [];
    if (forYouGrid.length > 0) result.push({ title: 'Für dich', data: chunkPairs(forYouGrid) });
    if (cooked.length > 0) result.push({ title: 'Schon gekocht', data: chunkPairs(cooked) });
    return { featured: featuredDish, sections: result };
  }, [state, query]);

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

  const { profile, listDishIds, usingOfflineData, ingredientMap } = state;

  // Section-Header nur zeigen, wenn es wirklich zwei Gruppen gibt (sonst schlichte Liste).
  const showSectionHeaders = sections.length > 1;

  const listBanner =
    listDishIds.size > 0 ? (
      <Pressable
        style={styles.listBanner}
        onPress={() => navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('ShoppingTab')}
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

  const featuredCard = featured ? (
    <FeaturedDishCard
      dish={featured}
      isFavorite={profile.favorites.includes(featured.id)}
      onToggleFavorite={handleToggleFavorite}
      onPress={(dishId) => navigation.navigate('DishDetail', { dishId })}
      ingredientMap={ingredientMap}
    />
  ) : null;

  const header = (offlineBanner || listBanner || featuredCard) ? (
    <View>
      {offlineBanner}
      {listBanner}
      {featuredCard}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Gericht suchen…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          accessibilityLabel="Gericht suchen"
        />
      </View>
      <SectionList<Dish[], { title: string; data: Dish[][] }>
        sections={sections}
        keyExtractor={(pair) => pair.map((d) => d.id).join('-')}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) =>
          showSectionHeaders ? <Text style={styles.sectionHeader}>{section.title}</Text> : null
        }
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
          featured ? null : (
            <View style={styles.empty}>
              <Image source={ICON_IMAGES.pan} style={styles.emptyIcon} resizeMode="contain" />
              {query ? (
                <>
                  <Text style={styles.emptyTitle}>Keine Treffer</Text>
                  <Text style={styles.emptySubtitle}>
                    Für „{searchQuery.trim()}" wurde kein Gericht gefunden.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>Noch nichts Passendes</Text>
                  <Text style={styles.emptySubtitle}>
                    Alle Gerichte wurden aufgrund deiner Einstellungen gefiltert. Passe dein Profil an, um mehr zu entdecken.
                  </Text>
                </>
              )}
            </View>
          )
        }
      />
    </View>
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
  container: { flex: 1, backgroundColor: colors.background },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  list: { padding: 16, backgroundColor: colors.background },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridSpacer: { flex: 1 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
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
  emptyIcon: { width: 56, height: 56, tintColor: colors.primaryMuted, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
