import type { Allergen, Dish, DietOption, UserProfile } from '../../types';

// ── Allergen filter ────────────────────────────────────────────────────────

export function computeDishAllergens(ingredientAllergens: Allergen[][]): Allergen[] {
  const union = new Set<Allergen>();
  for (const allergens of ingredientAllergens) {
    for (const allergen of allergens) union.add(allergen);
  }
  return Array.from(union);
}

export function isDishAllergenSafe(dish: Dish, allergies: Allergen[]): boolean {
  if (allergies.length === 0) return true;
  const userSet = new Set<Allergen>(allergies);
  return !dish.allergens.some((a) => userSet.has(a));
}

// ── Diet filter ────────────────────────────────────────────────────────────
// diet_verified is hand-authored — halal is NOT derivable from ingredients

export function isDishDietCompatible(dish: Dish, diet: DietOption): boolean {
  if (diet === 'omnivore') return true;
  return dish.diet_verified.includes(diet);
}

// ── Equipment filter ───────────────────────────────────────────────────────
// equipment_required is AND of OR-groups: every group needs at least one match

export function isDishEquipmentPossible(dish: Dish, userEquipment: string[]): boolean {
  if (dish.equipment_required.length === 0) return true;
  const equipmentSet = new Set(userEquipment);
  return dish.equipment_required.every((orGroup) =>
    orGroup.some((e) => equipmentSet.has(e))
  );
}

// ── Time filter ────────────────────────────────────────────────────────────
// 20% tolerance so a 17-min dish isn't hidden for a 15-min budget

export function isDishTimeCompatible(dish: Dish, timeBudgetMin: number): boolean {
  return dish.time_minutes <= timeBudgetMin * 1.2;
}

// ── Combined hard gate ─────────────────────────────────────────────────────

export function filterCompatibleDishes(dishes: Dish[], profile: UserProfile): Dish[] {
  return dishes.filter(
    (dish) =>
      isDishAllergenSafe(dish, profile.allergies) &&
      isDishDietCompatible(dish, profile.diet) &&
      isDishEquipmentPossible(dish, profile.equipment) &&
      isDishTimeCompatible(dish, profile.time_budget_min)
  );
}

// Legacy alias — used by existing tests and FeedScreen
export const isDishSafe = isDishAllergenSafe;
export const filterSafeDishes = (dishes: Dish[], profile: UserProfile) =>
  dishes.filter((d) => isDishAllergenSafe(d, profile.allergies));
