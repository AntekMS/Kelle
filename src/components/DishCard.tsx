import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type { Dish, Ingredient } from '../types';
import { colors } from '../theme/colors';
import { computeNutritionPerServing } from '../features/feed/scoring';
import DISH_IMAGES from './dish-images';
import ICON_IMAGES from './icon-images';

interface DishCardProps {
  dish: Dish;
  isCooked: boolean;
  isInShoppingList: boolean;
  isFavorite: boolean;
  onMarkCooked: (dishId: string) => void;
  onToggleShoppingList: (dishId: string) => void;
  onToggleFavorite: (dishId: string) => void;
  ingredientMap?: Map<string, Ingredient>;
}

export default function DishCard({
  dish,
  isCooked,
  isInShoppingList,
  isFavorite,
  onMarkCooked,
  onToggleShoppingList,
  onToggleFavorite,
  ingredientMap,
}: DishCardProps) {
  const imageSource = DISH_IMAGES[dish.image_asset];
  const nutrition = ingredientMap ? computeNutritionPerServing(dish, ingredientMap) : null;

  return (
    <View style={styles.card}>
      {imageSource && (
        <Image
          source={imageSource}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityLabel={dish.name}
        />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{dish.name}</Text>
          <Pressable
            onPress={() => onToggleFavorite(dish.id)}
            hitSlop={8}
            accessibilityLabel={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            accessibilityRole="togglebutton"
            accessibilityState={{ selected: isFavorite }}
          >
            <Image
              source={isFavorite ? ICON_IMAGES.heart_filled : ICON_IMAGES.heart_outline}
              style={styles.heartIcon}
              resizeMode="contain"
            />
          </Pressable>
          {isCooked && (
            <View style={styles.cookedBadge}>
              <Image source={ICON_IMAGES.check} style={styles.badgeIcon} resizeMode="contain" />
              <Text style={styles.cookedBadgeText}>Gekocht</Text>
            </View>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {dish.description}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Image source={ICON_IMAGES.time} style={styles.metaIcon} resizeMode="contain" />
            <Text style={styles.metaText}>{dish.time_minutes} Min.</Text>
          </View>
          {dish.technique_taught && (
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
          {!dish.diet_verified.includes('vegan') &&
            dish.diet_verified.includes('vegetarian') && (
              <View style={styles.metaItem}>
                <Image source={ICON_IMAGES.vegetarisch} style={styles.metaIcon} resizeMode="contain" />
                <Text style={styles.dietTag}>Vegetarisch</Text>
              </View>
            )}
        </View>

        {nutrition && (
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
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.shoppingButton, isInShoppingList && styles.shoppingButtonActive]}
            onPress={() => onToggleShoppingList(dish.id)}
            accessibilityLabel={isInShoppingList ? 'Aus Liste entfernen' : 'Zur Liste hinzufügen'}
          >
            {isInShoppingList && (
              <Image
                source={ICON_IMAGES.check}
                style={[styles.buttonIcon, styles.buttonIconActive]}
                resizeMode="contain"
              />
            )}
            <Text style={[styles.shoppingButtonText, isInShoppingList && styles.shoppingButtonTextActive]}>
              {isInShoppingList ? 'In der Liste' : '+ Zur Liste'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, isCooked && styles.buttonDisabled]}
            onPress={() => onMarkCooked(dish.id)}
            disabled={isCooked}
            accessibilityLabel={isCooked ? 'Bereits als gekocht markiert' : 'Als gekocht markieren'}
          >
            {isCooked && (
              <Image source={ICON_IMAGES.check} style={styles.buttonIconDisabled} resizeMode="contain" />
            )}
            <Text style={[styles.buttonText, isCooked && styles.buttonTextDisabled]}>
              {isCooked ? 'Gekocht' : 'Als gekocht markieren'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  heroImage: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 18,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: { fontSize: 18, fontFamily: 'Spectral_600SemiBold', color: colors.text, flex: 1 },
  heartIcon: { width: 22, height: 22, tintColor: colors.primary },
  cookedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cookedBadgeText: { fontSize: 13, color: colors.secondary, fontWeight: '600' },
  badgeIcon: { width: 13, height: 13, tintColor: colors.secondary },
  description: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { width: 14, height: 14, tintColor: colors.textMuted },
  metaText: { fontSize: 14, color: colors.textMuted },
  techniqueTag: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  dietTag: { fontSize: 13, color: colors.textMuted },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 8,
  },
  nutritionItem: { flex: 1, alignItems: 'center', gap: 1 },
  nutritionValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  nutritionLabel: { fontSize: 11, color: colors.textMuted },
  nutritionDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginVertical: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  shoppingButton: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  shoppingButtonActive: {
    backgroundColor: colors.primary,
  },
  shoppingButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  shoppingButtonTextActive: { color: colors.surface },
  buttonIcon: { width: 14, height: 14, tintColor: colors.primary },
  buttonIconActive: { tintColor: colors.surface },
  button: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  buttonDisabled: { backgroundColor: colors.background },
  buttonText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  buttonTextDisabled: { color: colors.disabled },
  buttonIconDisabled: { width: 14, height: 14, tintColor: colors.disabled },
});
