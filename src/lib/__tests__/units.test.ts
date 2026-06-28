import type { Ingredient } from '../../types';
import { normalizeToBase } from '../units';

const mlIngredient: Ingredient = {
  id: 'oil',
  name: 'Olivenöl',
  allergens: [],
  nutrients_per_100g: { kcal: 884, protein_g: 0, fat_g: 100, carbs_g: 0, fiber_g: 0 },
  base_unit: 'ml',
  unit_conversions: { el: 15, tl: 5 },
  aisle_category: 'Öle',
  is_pantry_staple: true,
  animal_origin: 'none',
};

const gIngredient: Ingredient = {
  ...mlIngredient,
  id: 'egg',
  base_unit: 'g',
  unit_conversions: { stueck: 55 },
};

describe('normalizeToBase (geteilte Einheiten-Konversion)', () => {
  test('Einheit == base_unit → Passthrough', () => {
    expect(normalizeToBase(200, 'ml', mlIngredient)).toBe(200);
    expect(normalizeToBase(80, 'g', gIngredient)).toBe(80);
  });

  test('konvertiert über unit_conversions', () => {
    expect(normalizeToBase(2, 'el', mlIngredient)).toBe(30);
    expect(normalizeToBase(3, 'stueck', gIngredient)).toBe(165);
  });

  test('unbekannte Einheit → behandelt Menge als Basiseinheit (kein Drop, kein Crash)', () => {
    // Wichtig: Scoring und Einkaufsliste müssen sich hier identisch verhalten.
    expect(normalizeToBase(100, 'stueck', mlIngredient)).toBe(100);
  });

  test('Menge 0 bleibt 0', () => {
    expect(normalizeToBase(0, 'el', mlIngredient)).toBe(0);
  });
});
