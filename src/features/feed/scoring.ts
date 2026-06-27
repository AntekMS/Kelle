import type { Dish, Goal, Ingredient, UserProfile } from '../../types';

// ── Machbarkeit ────────────────────────────────────────────────────────────
// Based on whether technique_taught is new for this user.
// 0 new = 0.8 (comfortable, no growth), 1 new = 1.0 (sweet spot), 2 = 0.4, 3+ = 0.1

const MACHBARKEIT_TABLE = [0.8, 1.0, 0.4, 0.1] as const;

function scoreMachbarkeit(dish: Dish, profile: UserProfile): number {
  const isNew = !profile.skill_techniques.includes(dish.technique_taught);
  const newCount = isNew ? 1 : 0;
  return MACHBARKEIT_TABLE[Math.min(newCount, 3)];
}

// ── Nährwerte pro Portion ──────────────────────────────────────────────────
// Needed for ziel_fit. Sums ingredient nutrients weighted by amount.

interface NutritionPerServing {
  kcal: number;
  protein_g: number;
  carbs_g: number;
}

function computeNutritionPerServing(
  dish: Dish,
  ingredientMap: Map<string, Ingredient>
): NutritionPerServing {
  let kcal = 0;
  let protein_g = 0;
  let carbs_g = 0;

  for (const di of dish.ingredients) {
    const ing = ingredientMap.get(di.ingredient_id);
    if (!ing) continue;

    // Normalize to base_unit amount
    const conversionFactor = ing.unit_conversions[di.unit] ?? (di.unit === 'g' || di.unit === 'ml' ? 1 : null);
    if (conversionFactor === null) continue;

    const amountInBaseUnit = di.amount * conversionFactor;
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

// ── Final Score ────────────────────────────────────────────────────────────

export function scoreDish(
  dish: Dish,
  profile: UserProfile,
  ingredientMap: Map<string, Ingredient>
): number {
  const machbarkeit = scoreMachbarkeit(dish, profile);
  const zielFit = scoreZielFit(dish, profile.goals, ingredientMap);
  const repetition = penaltyRepetition(dish, profile);

  // Spec formula: ziel_fit × machbarkeit − strafe_wiederholung (applied as multiplier)
  return zielFit * machbarkeit * repetition;
}

export function rankDishes(
  safeDishes: Dish[],
  profile: UserProfile,
  ingredients: Ingredient[] = []
): Dish[] {
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
  return [...safeDishes].sort(
    (a, b) => scoreDish(b, profile, ingredientMap) - scoreDish(a, profile, ingredientMap)
  );
}
