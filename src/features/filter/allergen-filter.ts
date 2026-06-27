import type { Allergen, Dish, UserProfile } from '../../types';

/**
 * Computes the allergen set of a dish by taking the union of all ingredient allergens.
 * Dishes never have manually-set allergens — always derived from ingredients.
 */
export function computeDishAllergens(
  ingredientAllergens: Allergen[][]
): Allergen[] {
  const union = new Set<Allergen>();
  for (const allergens of ingredientAllergens) {
    for (const allergen of allergens) {
      union.add(allergen);
    }
  }
  return Array.from(union);
}

/**
 * Returns true if the dish is safe for the user — i.e. none of the user's
 * allergens appear in the dish's allergen set.
 *
 * This is always rule-based. Never probabilistic, never AI-guessed.
 */
export function isDishSafe(dish: Dish, profile: UserProfile): boolean {
  if (profile.allergies.length === 0) return true;
  const userAllergySet = new Set<Allergen>(profile.allergies);
  return !dish.allergens.some((a) => userAllergySet.has(a));
}

/**
 * Filters a list of dishes, returning only those safe for the user.
 * Hard gate — no dish with a matching allergen ever passes through.
 */
export function filterSafeDishes(dishes: Dish[], profile: UserProfile): Dish[] {
  return dishes.filter((dish) => isDishSafe(dish, profile));
}
