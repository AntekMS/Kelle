import type { Dish, Ingredient } from '../../types';
import { isValidCloudDish, isValidCloudIngredient, hardenCloudDishes } from '../cloud-catalog';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validIngredient: Ingredient = {
  id: 'ing1',
  name: 'Milch',
  allergens: ['milk'],
  nutrients_per_100g: { kcal: 64, protein_g: 3.3, fat_g: 3.7, carbs_g: 4.7, fiber_g: 0 },
  base_unit: 'ml',
  unit_conversions: { el: 15, tl: 5 },
  aisle_category: 'Kühlregal',
  is_pantry_staple: false,
  animal_origin: 'dairy',
};

const validDish: Dish = {
  id: 'd1',
  name: 'Pfannkuchen',
  description: 'Lecker',
  serving_base: 2,
  techniques_required: ['backen'],
  technique_taught: 'backen',
  diet_verified: ['vegetarian'],
  equipment_required: [['herdplatte']],
  equipment_optional: [],
  ingredients: [{ ingredient_id: 'ing1', amount: 2, unit: 'el' }],
  allergens: ['milk'],
  time_minutes: 20,
  steps: ['Schritt 1'],
  image_asset: 'pancake',
};

// ── isValidCloudDish ──────────────────────────────────────────────────────────

describe('isValidCloudDish', () => {
  test('akzeptiert ein vollständiges Gericht', () => {
    expect(isValidCloudDish(validDish)).toBe(true);
  });

  test('verwirft null/undefined/Primitive', () => {
    expect(isValidCloudDish(null)).toBe(false);
    expect(isValidCloudDish(undefined)).toBe(false);
    expect(isValidCloudDish('dish')).toBe(false);
  });

  test('verwirft Gericht ohne allergens-Array (fail-safe)', () => {
    expect(isValidCloudDish({ ...validDish, allergens: undefined })).toBe(false);
    expect(isValidCloudDish({ ...validDish, allergens: 'milk' })).toBe(false);
  });

  test('verwirft Gericht ohne diet_verified-Array', () => {
    expect(isValidCloudDish({ ...validDish, diet_verified: undefined })).toBe(false);
  });

  test('verwirft Gericht mit malformten ingredients', () => {
    expect(isValidCloudDish({ ...validDish, ingredients: undefined })).toBe(false);
    expect(
      isValidCloudDish({ ...validDish, ingredients: [{ ingredient_id: 'ing1' }] })
    ).toBe(false);
  });

  test('verwirft Gericht ohne time_minutes/equipment_required (harte Filter)', () => {
    expect(isValidCloudDish({ ...validDish, time_minutes: '20' })).toBe(false);
    expect(isValidCloudDish({ ...validDish, equipment_required: undefined })).toBe(false);
  });
});

// ── isValidCloudIngredient ────────────────────────────────────────────────────

describe('isValidCloudIngredient', () => {
  test('akzeptiert eine vollständige Zutat', () => {
    expect(isValidCloudIngredient(validIngredient)).toBe(true);
  });

  test('verwirft Zutat ohne allergens-Array (fail-safe)', () => {
    expect(isValidCloudIngredient({ ...validIngredient, allergens: undefined })).toBe(false);
  });

  test('verwirft Zutat ohne Nährwerte oder mit falscher base_unit', () => {
    expect(isValidCloudIngredient({ ...validIngredient, nutrients_per_100g: null })).toBe(false);
    expect(isValidCloudIngredient({ ...validIngredient, base_unit: 'kg' })).toBe(false);
  });
});

// ── hardenCloudDishes ─────────────────────────────────────────────────────────

describe('hardenCloudDishes', () => {
  test('vereinigt dish.allergens mit den Zutaten-Allergenen', () => {
    // Cloud-Gericht behauptet allergenfrei, Zutat enthält aber Milch
    const understated: Dish = { ...validDish, allergens: [] };
    const [hardened] = hardenCloudDishes([understated], [validIngredient]);
    expect(hardened.allergens).toContain('milk');
  });

  test('behält hand-authored Allergene, die keiner Zutat zugeordnet sind', () => {
    const dish: Dish = { ...validDish, allergens: ['sesame'] };
    const [hardened] = hardenCloudDishes([dish], [validIngredient]);
    expect(hardened.allergens).toEqual(expect.arrayContaining(['sesame', 'milk']));
  });

  test('verwirft Gerichte mit unbekannten Zutaten (Allergene nicht verifizierbar)', () => {
    const dish: Dish = {
      ...validDish,
      ingredients: [{ ingredient_id: 'unbekannt', amount: 1, unit: 'g' }],
    };
    expect(hardenCloudDishes([dish], [validIngredient])).toEqual([]);
  });
});
