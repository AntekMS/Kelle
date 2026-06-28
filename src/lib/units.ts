import type { Ingredient } from '../types';

/**
 * Converts an ingredient amount given in `unit` into the ingredient's base_unit (g or ml).
 *
 * Single source of truth — used by BOTH the shopping-list aggregation (database.ts)
 * and the nutrition calculation (scoring.ts) so the two layers can never drift.
 *
 * Fallback: a unit that is neither the base_unit nor present in `unit_conversions`
 * is treated as already being in the base unit (factor 1) rather than dropped, so a
 * missing conversion never silently removes an ingredient from either layer.
 */
export function normalizeToBase(amount: number, unit: string, ing: Ingredient): number {
  if (unit === ing.base_unit) return amount;
  const factor = ing.unit_conversions[unit];
  return factor != null ? amount * factor : amount;
}
