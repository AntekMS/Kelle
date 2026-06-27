import type { Dish, UserProfile } from '../../types';

// Scoring weights — all multipliers stay in [0.7, 1.0] so the ranking stays subtle
const W_ALREADY_COOKED = 0.7;
const W_DIFFICULTY_MISMATCH = 0.8;
const W_DIET_MATCH = 1.0; // neutral — filter handles hard blocks

/**
 * Returns a score [0, 1] for a dish relative to a user profile.
 * Higher = more relevant. The allergen hard-gate runs BEFORE this — only
 * safe dishes reach scoring.
 */
export function scoreDish(dish: Dish, profile: UserProfile): number {
  let score = 1.0;

  // Soft penalty: already cooked dishes are still shown, just ranked lower
  if (profile.cooked_dish_ids.includes(dish.id)) {
    score *= W_ALREADY_COOKED;
  }

  // Soft penalty: difficulty jump >1 from current average
  const avgDifficulty = estimateUserLevel(profile);
  if (dish.difficulty - avgDifficulty > 1) {
    score *= W_DIFFICULTY_MISMATCH;
  }

  return score;
}

/**
 * Estimates the user's current cooking level from cooked history.
 * Returns difficulty 1–3; defaults to 1 for new users.
 */
function estimateUserLevel(profile: UserProfile): number {
  if (profile.cooked_dish_ids.length === 0) return 1;
  // Simple proxy: number of cooked dishes drives level up, capped at 3
  return Math.min(3, 1 + Math.floor(profile.cooked_dish_ids.length / 5));
}

/**
 * Returns dishes sorted by score descending, allergen-safe dishes only.
 * Safe dishes must be passed in — caller runs allergen filter first.
 */
export function rankDishes(safeDishes: Dish[], profile: UserProfile): Dish[] {
  return [...safeDishes].sort(
    (a, b) => scoreDish(b, profile) - scoreDish(a, profile)
  );
}
