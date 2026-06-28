import type { Dish, Goal, Ingredient, UserProfile } from '../../types';
import { normalizeToBase } from '../../lib/units';

// ── Machbarkeit ────────────────────────────────────────────────────────────
// Based on how many of the techniques the dish demands are NEW for this user —
// i.e. the techniques it requires plus the one it teaches, minus what the user
// already knows.
// 0 new = 0.8 (comfortable, no growth), 1 new = 1.0 (sweet spot), 2 = 0.4, 3+ = 0.1

const MACHBARKEIT_TABLE = [0.8, 1.0, 0.4, 0.1] as const;

// Counts the distinct techniques a dish involves that the user has not marked as
// known. technique_taught is included because, by definition, it is something the
// dish introduces.
export function countNewTechniques(dish: Dish, profile: UserProfile): number {
  const known = new Set(profile.skill_techniques);
  const involved = new Set<string>(dish.techniques_required);
  if (dish.technique_taught) involved.add(dish.technique_taught);

  let newCount = 0;
  for (const technique of involved) {
    if (!known.has(technique)) newCount++;
  }
  return newCount;
}

function scoreMachbarkeit(dish: Dish, profile: UserProfile): number {
  const newCount = countNewTechniques(dish, profile);
  return MACHBARKEIT_TABLE[Math.min(newCount, 3)];
}

// ── Nährwerte pro Portion ──────────────────────────────────────────────────
// Needed for ziel_fit. Sums ingredient nutrients weighted by amount.

export interface NutritionPerServing {
  kcal: number;
  protein_g: number;
  carbs_g: number;
}

export function computeNutritionPerServing(
  dish: Dish,
  ingredientMap: Map<string, Ingredient>
): NutritionPerServing {
  let kcal = 0;
  let protein_g = 0;
  let carbs_g = 0;

  for (const di of dish.ingredients) {
    const ing = ingredientMap.get(di.ingredient_id);
    if (!ing) continue;

    // Normalize to base_unit amount (shared with the shopping-list layer)
    const amountInBaseUnit = normalizeToBase(di.amount, di.unit, ing);
    const factor = amountInBaseUnit / 100;

    kcal += ing.nutrients_per_100g.kcal * factor;
    protein_g += ing.nutrients_per_100g.protein_g * factor;
    carbs_g += ing.nutrients_per_100g.carbs_g * factor;
  }

  const servings = dish.serving_base > 0 ? dish.serving_base : 1;
  return {
    kcal: kcal / servings,
    protein_g: protein_g / servings,
    carbs_g: carbs_g / servings,
  };
}

// ── Ziel-Fit ───────────────────────────────────────────────────────────────
// Compressed to [0.7..1.0] — goal influences ranking subtly, never buries dishes

function scoreZielFit(
  dish: Dish,
  goals: Goal[],
  ingredientMap: Map<string, Ingredient>
): number {
  if (goals.length === 0 || goals.every((g) => g === 'none')) return 1.0;

  const nutrition = computeNutritionPerServing(dish, ingredientMap);
  let fit = 1.0;

  for (const goal of goals) {
    if (goal === 'none') continue;

    if (goal === 'high_protein') {
      // protein density: protein_g / kcal — higher is better
      const density = nutrition.kcal > 0 ? nutrition.protein_g / nutrition.kcal : 0;
      // 0.05 g/kcal = good (chicken breast ~0.08); compress to [0.7, 1.0]
      fit = Math.min(fit, 0.7 + Math.min(density / 0.05, 1.0) * 0.3);
    }

    if (goal === 'low_carb') {
      // carbs_g / kcal — lower is better
      const ratio = nutrition.kcal > 0 ? nutrition.carbs_g / nutrition.kcal : 1;
      // invert: ratio close to 0 = score 1.0
      fit = Math.min(fit, 0.7 + Math.max(0, 1 - ratio / 0.5) * 0.3);
    }

    if (goal === 'lighter') {
      // kcal per serving — lower is better; 400 kcal = target
      const lightness = Math.max(0, 1 - nutrition.kcal / 800);
      fit = Math.min(fit, 0.7 + lightness * 0.3);
    }
  }

  return Math.max(0.7, Math.min(1.0, fit));
}

// ── Strafe Wiederholung ────────────────────────────────────────────────────

const W_ALREADY_COOKED = 0.7;

function penaltyRepetition(dish: Dish, profile: UserProfile): number {
  return profile.cooked_dish_ids.includes(dish.id) ? W_ALREADY_COOKED : 1.0;
}

// ── Bonus Favoriten ────────────────────────────────────────────────────────
// Small additive boost so favorites float slightly higher without overriding safety/feasibility.

const BONUS_FAVORITE = 0.08;

// ── Bonus geteilte Zutaten ─────────────────────────────────────────────────
// Dishes that share ingredients with the active shopping list float higher —
// shorter shopping trip, less waste.

const MAX_OVERLAP_BONUS = 0.12;

function scoreIngredientOverlap(
  dish: Dish,
  activeIngredientIds: ReadonlySet<string>
): number {
  if (activeIngredientIds.size === 0 || dish.ingredients.length === 0) return 0;
  const overlap = dish.ingredients.filter((di) =>
    activeIngredientIds.has(di.ingredient_id)
  ).length;
  return (overlap / dish.ingredients.length) * MAX_OVERLAP_BONUS;
}

// ── Final Score ────────────────────────────────────────────────────────────

export function scoreDish(
  dish: Dish,
  profile: UserProfile,
  ingredientMap: Map<string, Ingredient>,
  activeIngredientIds: ReadonlySet<string> = new Set()
): number {
  const machbarkeit = scoreMachbarkeit(dish, profile);
  const zielFit = scoreZielFit(dish, profile.goals, ingredientMap);
  const repetition = penaltyRepetition(dish, profile);
  const favBonus = profile.favorites.includes(dish.id) ? BONUS_FAVORITE : 0;
  const overlapBonus = scoreIngredientOverlap(dish, activeIngredientIds);

  return zielFit * machbarkeit * repetition + favBonus + overlapBonus;
}

export function rankDishes(
  safeDishes: Dish[],
  profile: UserProfile,
  ingredients: Ingredient[] = [],
  activeIngredientIds: ReadonlySet<string> = new Set()
): Dish[] {
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
  return [...safeDishes].sort(
    (a, b) =>
      scoreDish(b, profile, ingredientMap, activeIngredientIds) -
      scoreDish(a, profile, ingredientMap, activeIngredientIds)
  );
}
