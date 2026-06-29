import type { Dish } from '../../types';

/**
 * Splits an already-ranked dish list into "Für dich" (not yet cooked) and
 * "Schon gekocht" — purely for the feed's section display. Order within each
 * group is preserved (the ranking from rankDishes stays intact).
 *
 * The repetition_penalty in scoring.ts still applies; this only makes the
 * separation explicit in the UI instead of silently sinking cooked dishes.
 */
export function partitionByCooked(
  dishes: Dish[],
  cookedIds: string[]
): { forYou: Dish[]; cooked: Dish[] } {
  const cookedSet = new Set(cookedIds);
  const forYou: Dish[] = [];
  const cooked: Dish[] = [];
  for (const dish of dishes) {
    if (cookedSet.has(dish.id)) cooked.push(dish);
    else forYou.push(dish);
  }
  return { forYou, cooked };
}
