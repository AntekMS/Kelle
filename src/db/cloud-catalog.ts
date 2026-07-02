import { supabase } from '../lib/supabase';
import { computeDishAllergens } from '../features/filter/allergen-filter';
import type { Allergen, Dish, Ingredient } from '../types';

// ── Validierung ────────────────────────────────────────────────────────────
// Cloud-Daten werden NIE ungeprüft übernommen: der Allergenfilter ist die
// Kern-Sicherheitszusage der App und darf nicht an fehlenden/malformten
// Feldern scheitern. Fail-safe: was nicht validiert, wird verworfen.

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((e) => typeof e === 'string');
}

export function isValidCloudDish(v: unknown): v is Dish {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.name) &&
    typeof d.serving_base === 'number' &&
    typeof d.time_minutes === 'number' &&
    isStringArray(d.allergens) &&
    isStringArray(d.diet_verified) &&
    isStringArray(d.techniques_required) &&
    typeof d.technique_taught === 'string' &&
    Array.isArray(d.equipment_required) &&
    d.equipment_required.every((g) => isStringArray(g)) &&
    isStringArray(d.steps) &&
    Array.isArray(d.ingredients) &&
    d.ingredients.every((di) => {
      if (typeof di !== 'object' || di === null) return false;
      const e = di as Record<string, unknown>;
      return isNonEmptyString(e.ingredient_id) && typeof e.amount === 'number' && isNonEmptyString(e.unit);
    })
  );
}

export function isValidCloudIngredient(v: unknown): v is Ingredient {
  if (typeof v !== 'object' || v === null) return false;
  const i = v as Record<string, unknown>;
  const n = i.nutrients_per_100g as Record<string, unknown> | null | undefined;
  return (
    isNonEmptyString(i.id) &&
    isNonEmptyString(i.name) &&
    isStringArray(i.allergens) &&
    typeof n === 'object' &&
    n !== null &&
    typeof n.kcal === 'number' &&
    typeof n.protein_g === 'number' &&
    typeof n.carbs_g === 'number' &&
    (i.base_unit === 'g' || i.base_unit === 'ml') &&
    typeof i.unit_conversions === 'object' &&
    i.unit_conversions !== null &&
    isNonEmptyString(i.aisle_category)
  );
}

// Fail-safe-Härtung nach dem Fetch: dish.allergens wird mit der Vereinigung
// der Zutaten-Allergene ergänzt (eine untertriebene Cloud-Allergenliste kann
// Gerichte so nicht am Filter vorbeischleusen). Gerichte, die auf unbekannte
// Zutaten verweisen, sind nicht verifizierbar und werden verworfen.
export function hardenCloudDishes(dishes: Dish[], ingredients: Ingredient[]): Dish[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const result: Dish[] = [];
  for (const dish of dishes) {
    const dishIngredients = dish.ingredients.map((di) => byId.get(di.ingredient_id));
    if (dishIngredients.some((i) => i === undefined)) continue;
    const fromIngredients = computeDishAllergens(
      (dishIngredients as Ingredient[]).map((i) => i.allergens)
    );
    const allergens: Allergen[] = Array.from(new Set([...dish.allergens, ...fromIngredients]));
    result.push({ ...dish, allergens });
  }
  return result;
}

export async function fetchDishesFromCloud(): Promise<Dish[]> {
  if (!supabase) throw new Error('Supabase nicht konfiguriert');
  const { data, error } = await supabase
    .from('dishes')
    .select('data');

  if (error) throw new Error(`Supabase dishes: ${error.message}`);
  return (data ?? [])
    .map((row: { data: unknown }) => row.data)
    .filter(isValidCloudDish);
}

export async function fetchIngredientsFromCloud(): Promise<Ingredient[]> {
  if (!supabase) throw new Error('Supabase nicht konfiguriert');
  const { data, error } = await supabase
    .from('ingredients')
    .select('data');

  if (error) throw new Error(`Supabase ingredients: ${error.message}`);
  return (data ?? [])
    .map((row: { data: unknown }) => row.data)
    .filter(isValidCloudIngredient);
}
