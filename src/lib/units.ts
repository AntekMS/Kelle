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

/**
 * Formats an aggregated shopping-list amount (always stored in base_unit g/ml) for display.
 *
 * Countable ingredients (those with a `stueck` conversion, e.g. eggs, onions, lemons) are
 * shown as whole pieces ("2 Stück") instead of grams — users don't think in grams of egg.
 * The amount stays stored in grams (so aggregation and nutrition stay correct); only the
 * display is converted back via the same `stueck` factor.
 *
 * Everything else: kg/l from 1000 upwards, otherwise the raw base unit.
 */
export function formatShoppingAmount(amountBase: number, ing: Ingredient | undefined): string {
  const stueckFactor = ing?.unit_conversions.stueck;
  if (stueckFactor != null && stueckFactor > 0) {
    const pieces = Math.max(1, Math.round(amountBase / stueckFactor));
    return `${pieces} Stück`;
  }

  const baseUnit = ing?.base_unit ?? 'g';
  if (baseUnit === 'g' && amountBase >= 1000) {
    return `${(amountBase / 1000).toFixed(1).replace('.0', '')} kg`;
  }
  if (baseUnit === 'ml' && amountBase >= 1000) {
    return `${(amountBase / 1000).toFixed(1).replace('.0', '')} l`;
  }
  return `${Math.round(amountBase)} ${baseUnit}`;
}

/**
 * Skaliert eine Original-Rezeptmenge auf die gewählte Portionszahl (#46).
 * Reine Anzeige-Schicht (DishDetail-Portionsrechner) — die Einkaufsliste
 * rechnet weiter mit serving_base. Max. 1 Nachkommastelle.
 */
export function scaleServingAmount(amount: number, servings: number, servingBase: number): number {
  if (servingBase <= 0 || servings <= 0) return amount;
  return Math.round(((amount * servings) / servingBase) * 10) / 10;
}
