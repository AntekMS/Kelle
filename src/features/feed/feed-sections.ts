import type { Dish } from '../../types';

/**
 * Splits an already-ranked dish list into "Für dich" (not yet cooked) and
 * "Schon gekocht" — purely for the feed's section display. Order within each
 * group is preserved (the ranking from rankDishes stays intact).
 *
 * The repetition_penalty in scoring.ts still applies; this only makes the
 * separation explicit in the UI instead of silently sinking cooked dishes.
 */
/**
 * Hält die Feed-Reihenfolge über Fokus-Wechsel stabil (#44): Gerichte, die
 * schon angezeigt wurden, behalten ihre Position; Gerichte, die durch den
 * (immer frisch angewandten) harten Filter neu dazukommen, werden hinten in
 * ihrer Ranking-Reihenfolge angefügt. Gerichte, die nicht mehr in nextRanked
 * enthalten sind (z. B. neue Allergie), fallen raus — der harte Filter
 * bestimmt IMMER die Menge, hier geht es nur um die Sortierung.
 */
export function stabilizeRanking(prevOrder: Dish[], nextRanked: Dish[]): Dish[] {
  const remaining = new Map(nextRanked.map((d) => [d.id, d]));
  const kept: Dish[] = [];
  for (const prev of prevOrder) {
    const next = remaining.get(prev.id);
    if (next) {
      kept.push(next);
      remaining.delete(prev.id);
    }
  }
  return [...kept, ...remaining.values()];
}

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
