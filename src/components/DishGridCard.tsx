import { View, Text, Image, StyleSheet } from 'react-native';
import type { Dish, Ingredient } from '../types';
import { colors } from '../theme/colors';
import { computeNutritionPerServing } from '../features/feed/scoring';
import PressableScale from './PressableScale';
import DISH_IMAGES from './dish-images';
import ICON_IMAGES from './icon-images';

interface DishGridCardProps {
  dish: Dish;
  isCooked: boolean;
  isFavorite: boolean;
  onToggleFavorite: (dishId: string) => void;
  onPress: (dishId: string) => void;
  ingredientMap?: Map<string, Ingredient>;
}

/**
 * Kompakte Gerichtekarte für das 2-Spalten-Grid im Feed/Favoriten.
 * Bewusst minimal: Bild + Herz-Overlay + Name + eine Meta-Zeile (Zeit · kcal).
 * Aktionen (Liste/Gekocht) liegen auf der Detailseite.
 */
export default function DishGridCard({
  dish,
  isCooked,
  isFavorite,
  onToggleFavorite,
  onPress,
  ingredientMap,
}: DishGridCardProps) {
  const imageSource = DISH_IMAGES[dish.image_asset];
  const nutrition = ingredientMap ? computeNutritionPerServing(dish, ingredientMap) : null;

  return (
    <PressableScale
      style={styles.card}
      activeScale={0.97}
      onPress={() => onPress(dish.id)}
      accessibilityLabel={`${dish.name} – Rezept öffnen`}
      accessibilityRole="button"
    >
      <View style={styles.imageWrap}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}

        {isCooked && (
          <View style={styles.cookedBadge}>
            <Image source={ICON_IMAGES.check} style={styles.cookedIcon} resizeMode="contain" />
          </View>
        )}

        <PressableScale
          style={styles.heartButton}
          activeScale={0.8}
          hitSlop={8}
          onPress={() => onToggleFavorite(dish.id)}
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

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {dish.name}
        </Text>
        <View style={styles.metaRow}>
          <Image source={ICON_IMAGES.time} style={styles.metaIcon} resizeMode="contain" />
          <Text style={styles.metaText}>{dish.time_minutes} Min.</Text>
          {nutrition && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{Math.round(nutrition.kcal)} kcal</Text>
            </>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrap: { width: '100%', aspectRatio: 4 / 3, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageFallback: { backgroundColor: colors.surfaceAlt },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: { width: 18, height: 18, tintColor: colors.primary },
  cookedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookedIcon: { width: 15, height: 15, tintColor: colors.surface },
  content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 4 },
  name: { fontSize: 15, fontFamily: 'Spectral_600SemiBold', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { width: 13, height: 13, tintColor: colors.textMuted },
  metaText: { fontSize: 12.5, color: colors.textMuted },
  metaDot: { fontSize: 12.5, color: colors.textMuted, marginHorizontal: 1 },
});
