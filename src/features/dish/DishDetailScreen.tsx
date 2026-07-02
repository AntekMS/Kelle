import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { Dish, DishIngredient, Ingredient, UserProfile } from '../../types';
import {
  getDishById,
  getAllIngredients,
  getActiveDishIds,
  addDishToList,
  removeDishFromList,
  markDishCooked,
} from '../../db/database';
import { loadProfile, saveProfile } from '../../store/profile-store';
import { scaleServingAmount } from '../../lib/units';
import { computeNutritionPerServing } from '../feed/scoring';
import { colors } from '../../theme/colors';
import PressableScale from '../../components/PressableScale';
import DISH_IMAGES from '../../components/dish-images';
import ICON_IMAGES from '../../components/icon-images';

type DishDetailRoute = RouteProp<{ DishDetail: { dishId: string } }, 'DishDetail'>;

const UNIT_LABELS: Record<string, string> = {
  g: 'g',
  ml: 'ml',
  stueck: 'Stück',
  el: 'EL',
  tl: 'TL',
};

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 8;

function formatIngredientAmount(di: DishIngredient, servings: number, servingBase: number): string {
  const label = UNIT_LABELS[di.unit] ?? di.unit;
  return `${scaleServingAmount(di.amount, servings, servingBase)} ${label}`;
}

export default function DishDetailScreen() {
  const route = useRoute<DishDetailRoute>();
  const { dishId } = route.params;
  const insets = useSafeAreaInsets();

  const [dish, setDish] = useState<Dish | null>(null);
  const [ingredientMap, setIngredientMap] = useState<Map<string, Ingredient>>(new Map());
  const [inList, setInList] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(true);
  // Jüngster Profil-Stand für Mutationen — der Render-Snapshot in `profile`
  // hinkt bei schnellen aufeinanderfolgenden Taps hinterher (Lost Update).
  const profileRef = useRef<UserProfile | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const markingCooked = useRef(false);

  const load = useCallback(async () => {
    const [loadedDish, allIngredients, activeIds, loadedProfile] = await Promise.all([
      getDishById(dishId),
      getAllIngredients(),
      getActiveDishIds(),
      loadProfile(),
    ]);
    setDish(loadedDish);
    if (loadedDish) setServings(loadedDish.serving_base);
    setIngredientMap(new Map(allIngredients.map((i) => [i.id, i])));
    setInList(activeIds.includes(dishId));
    profileRef.current = loadedProfile;
    setProfile(loadedProfile);
    setLoading(false);
  }, [dishId]);

  useEffect(() => {
    load();
  }, [load]);

  const isCooked = !!profile?.cooked_dish_ids.includes(dishId);
  const isFavorite = !!profile?.favorites.includes(dishId);

  async function handleToggleList() {
    if (!dish) return;
    if (inList) {
      await removeDishFromList(dish.id, ingredientMap);
      setInList(false);
    } else {
      await addDishToList(dish, ingredientMap);
      setInList(true);
    }
  }

  // Gemeinsamer Mutations-Pfad: liest den jüngsten Stand aus profileRef und
  // serialisiert die SecureStore-Writes, damit sich Herz + „gekocht" nicht
  // gegenseitig überschreiben.
  const updateProfile = useCallback(async (mutate: (p: UserProfile) => UserProfile) => {
    const current = profileRef.current;
    if (!current) return;
    const updated: UserProfile = { ...mutate(current), updated_at: new Date().toISOString() };
    profileRef.current = updated;
    setProfile(updated);
    saveQueue.current = saveQueue.current.then(() => saveProfile(updated));
    await saveQueue.current;
  }, []);

  async function handleToggleFavorite() {
    await updateProfile((p) => ({
      ...p,
      favorites: p.favorites.includes(dishId)
        ? p.favorites.filter((id) => id !== dishId)
        : [...p.favorites, dishId],
    }));
  }

  async function handleMarkCooked() {
    if (markingCooked.current || profileRef.current?.cooked_dish_ids.includes(dishId)) return;
    markingCooked.current = true;
    try {
      await markDishCooked(dishId);
      await updateProfile((p) =>
        p.cooked_dish_ids.includes(dishId)
          ? p
          : { ...p, cooked_dish_ids: [...p.cooked_dish_ids, dishId] }
      );
    } finally {
      markingCooked.current = false;
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dish) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Gericht nicht gefunden</Text>
      </View>
    );
  }

  const imageSource = DISH_IMAGES[dish.image_asset];
  const nutrition = computeNutritionPerServing(dish, ingredientMap);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {imageSource && (
        <Image source={imageSource} style={styles.hero} resizeMode="cover" accessibilityLabel={dish.name} />
      )}

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{dish.name}</Text>
          <PressableScale
            activeScale={0.8}
            hitSlop={8}
            onPress={handleToggleFavorite}
            accessibilityLabel={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            accessibilityRole="togglebutton"
            accessibilityState={{ selected: isFavorite }}
          >
            <Image
              source={isFavorite ? ICON_IMAGES.heart_filled : ICON_IMAGES.heart_outline}
              style={styles.heartIcon}
              resizeMode="contain"
            />
          </PressableScale>
        </View>
        {!!dish.description && <Text style={styles.description}>{dish.description}</Text>}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Image source={ICON_IMAGES.time} style={styles.metaIcon} resizeMode="contain" />
            <Text style={styles.metaText}>{dish.time_minutes} Min.</Text>
          </View>
          {!!dish.technique_taught && (
            <View style={styles.metaItem}>
              <Image source={ICON_IMAGES.technique} style={styles.metaIcon} resizeMode="contain" />
              <Text style={styles.techniqueTag}>{dish.technique_taught}</Text>
            </View>
          )}
          {dish.diet_verified.includes('vegan') && (
            <View style={styles.metaItem}>
              <Image source={ICON_IMAGES.vegan} style={styles.metaIcon} resizeMode="contain" />
              <Text style={styles.dietTag}>Vegan</Text>
            </View>
          )}
          {!dish.diet_verified.includes('vegan') && dish.diet_verified.includes('vegetarian') && (
            <View style={styles.metaItem}>
              <Image source={ICON_IMAGES.vegetarisch} style={styles.metaIcon} resizeMode="contain" />
              <Text style={styles.dietTag}>Vegetarisch</Text>
            </View>
          )}
        </View>

        <View style={styles.nutritionRow} accessibilityLabel={`Pro Portion: ${Math.round(nutrition.kcal)} Kalorien, ${Math.round(nutrition.protein_g)} Gramm Protein, ${Math.round(nutrition.carbs_g)} Gramm Kohlenhydrate`}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(nutrition.kcal)}</Text>
            <Text style={styles.nutritionLabel}>kcal</Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(nutrition.protein_g)} g</Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(nutrition.carbs_g)} g</Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
        </View>

        <Pressable
          style={[styles.listButton, inList && styles.listButtonActive]}
          onPress={handleToggleList}
          accessibilityLabel={inList ? 'Aus Einkaufsliste entfernen' : 'Zur Einkaufsliste hinzufügen'}
        >
          {inList && (
            <Image source={ICON_IMAGES.check} style={styles.listButtonIcon} resizeMode="contain" />
          )}
          <Text style={[styles.listButtonText, inList && styles.listButtonTextActive]}>
            {inList ? 'In der Liste' : '+ Zur Einkaufsliste'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.cookedButton, isCooked && styles.cookedButtonDone]}
          onPress={handleMarkCooked}
          disabled={isCooked}
          accessibilityLabel={isCooked ? 'Bereits als gekocht markiert' : 'Als gekocht markieren'}
        >
          {isCooked && (
            <Image source={ICON_IMAGES.check} style={styles.cookedButtonIcon} resizeMode="contain" />
          )}
          <Text style={[styles.cookedButtonText, isCooked && styles.cookedButtonTextDone]}>
            {isCooked ? 'Gekocht' : 'Als gekocht markieren'}
          </Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Zutaten</Text>
        <View style={styles.servingStepper}>
          <Pressable
            style={[styles.stepperButton, servings <= MIN_SERVINGS && styles.stepperButtonDisabled]}
            onPress={() => setServings((s) => Math.max(MIN_SERVINGS, s - 1))}
            disabled={servings <= MIN_SERVINGS}
            hitSlop={8}
            accessibilityLabel="Eine Portion weniger"
            accessibilityRole="button"
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <Text style={styles.stepperValue}>
            {servings} {servings === 1 ? 'Portion' : 'Portionen'}
          </Text>
          <Pressable
            style={[styles.stepperButton, servings >= MAX_SERVINGS && styles.stepperButtonDisabled]}
            onPress={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
            disabled={servings >= MAX_SERVINGS}
            hitSlop={8}
            accessibilityLabel="Eine Portion mehr"
            accessibilityRole="button"
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
        {servings !== dish.serving_base && (
          <Text style={styles.servingHint}>
            Mengen für {servings} {servings === 1 ? 'Portion' : 'Portionen'} umgerechnet (Rezept: {dish.serving_base})
          </Text>
        )}
        <View style={styles.ingredientList}>
          {dish.ingredients.map((di) => {
            const ing = ingredientMap.get(di.ingredient_id);
            return (
              <View key={di.ingredient_id} style={styles.ingredientRow}>
                <Text style={styles.ingredientName}>{ing?.name ?? di.ingredient_id}</Text>
                <Text style={styles.ingredientAmount}>
                  {formatIngredientAmount(di, servings, dish.serving_base)}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Zubereitung</Text>
        <View style={styles.steps}>
          {dish.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  hero: { width: '100%', height: 220 },
  body: { padding: 20, gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  name: { flex: 1, fontSize: 24, fontFamily: 'Spectral_700Bold', color: colors.text },
  heartIcon: { width: 26, height: 26, tintColor: colors.primary, marginTop: 4 },
  description: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { width: 15, height: 15, tintColor: colors.textMuted },
  metaText: { fontSize: 14, color: colors.textMuted },
  techniqueTag: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  dietTag: { fontSize: 14, color: colors.textMuted },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
  },
  nutritionItem: { flex: 1, alignItems: 'center', gap: 2 },
  nutritionValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  nutritionLabel: { fontSize: 12, color: colors.textMuted },
  nutritionDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginVertical: 6 },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  listButtonActive: { backgroundColor: colors.primary },
  listButtonIcon: { width: 16, height: 16, tintColor: colors.surface },
  listButtonText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  listButtonTextActive: { color: colors.surface },
  cookedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 14,
  },
  cookedButtonDone: { backgroundColor: colors.background },
  cookedButtonIcon: { width: 16, height: 16, tintColor: colors.secondary },
  cookedButtonText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  cookedButtonTextDone: { color: colors.secondary },
  sectionTitle: { fontSize: 18, fontFamily: 'Spectral_600SemiBold', color: colors.text, marginTop: 12 },
  servingStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: { opacity: 0.35 },
  stepperButtonText: { fontSize: 20, lineHeight: 22, color: colors.primary, fontWeight: '500' },
  stepperValue: { fontSize: 15, fontWeight: '600', color: colors.text, minWidth: 100, textAlign: 'center' },
  servingHint: { fontSize: 13, color: colors.textMuted, marginTop: -4 },
  ingredientList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ingredientName: { fontSize: 15, color: colors.text, flex: 1 },
  ingredientAmount: { fontSize: 15, color: colors.textMuted, marginLeft: 12 },
  steps: { gap: 14 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
});
