import { View, Text, Image, StyleSheet } from 'react-native';
import type { Dish, Ingredient } from '../types';
import { colors } from '../theme/colors';
import { computeNutritionPerServing } from '../features/feed/scoring';
import PressableScale from './PressableScale';
import DISH_IMAGES from './dish-images';
import ICON_IMAGES from './icon-images';

interface FeaturedDishCardProps {
  dish: Dish;
  isFavorite: boolean;
  onToggleFavorite: (dishId: string) => void;
  onPress: (dishId: string) => void;
  ingredientMap?: Map<string, Ingredient>;
}

/**
 * Große Hero-Karte oben im Feed ("Für dich heute"). Weckt Interesse durch
 * volles Bild + Text-Overlay; Aktionen liegen auf der Detailseite.
 */
export default function FeaturedDishCard({
  dish,
  isFavorite,
  onToggleFavorite,
  onPress,
  ingredientMap,
}: FeaturedDishCardProps) {
  const imageSource = DISH_IMAGES[dish.image_asset];
  const nutrition = ingredientMap ? computeNutritionPerServing(dish, ingredientMap) : null;

  return (
    <PressableScale
      style={styles.card}
      activeScale={0.98}
      onPress={() => onPress(dish.id)}
      accessibilityLabel={`Für dich heute: ${dish.name} – Rezept öffnen`}
      accessibilityRole="button"
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
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

      <View style={styles.overlay} pointerEvents="none">
        {/* Pseudo-Verlauf ohne expo-linear-gradient: zwei weiche Stufen über dem Textblock */}
        <View style={styles.fadeLight} />
        <View style={styles.fadeMedium} />
        <View style={styles.overlayContent}>
          <Text style={styles.eyebrow}>FÜR DICH HEUTE</Text>
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
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{Math.round(nutrition.protein_g)} g Protein</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: { width: '100%', height: 210 },
  imageFallback: { backgroundColor: colors.surfaceAlt },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: { width: 22, height: 22, tintColor: colors.primary },
  // Overlay max ~1/3 der Bildhöhe (210 → ~70px Textblock, #40); das Foto soll wirken.
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  fadeLight: { height: 10, backgroundColor: 'rgba(45,42,38,0.18)' },
  fadeMedium: { height: 10, backgroundColor: 'rgba(45,42,38,0.38)' },
  overlayContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: 'rgba(45,42,38,0.55)',
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.accent,
  },
  name: { fontSize: 20, fontFamily: 'Spectral_700Bold', color: '#FFFFFF' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  metaIcon: { width: 14, height: 14, tintColor: '#F0EBE3' },
  metaText: { fontSize: 13, color: '#F0EBE3', fontWeight: '500' },
  metaDot: { fontSize: 13, color: '#F0EBE3' },
});
