import type { Ingredient } from '../../types';
import { normalizeToBase, formatShoppingAmount } from '../units';

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

describe('formatShoppingAmount (Anzeige-Formatierung)', () => {
  const onion: Ingredient = {
    ...gIngredient,
    id: 'onion',
    unit_conversions: { stueck: 80 },
  };
  const flour: Ingredient = {
    ...gIngredient,
    id: 'flour',
    unit_conversions: {}, // keine stueck-Konversion → g/kg
  };

  test('zählbare Zutat (Ei, 55g/Stück) → Stück', () => {
    expect(formatShoppingAmount(110, gIngredient)).toBe('2 Stück');
    expect(formatShoppingAmount(55, gIngredient)).toBe('1 Stück');
  });

  test('zählbare Zutat rundet auf ganze Stück', () => {
    // 150g / 80g ≈ 1,875 → 2 Stück
    expect(formatShoppingAmount(150, onion)).toBe('2 Stück');
    // kleiner Rest → mindestens 1 Stück
    expect(formatShoppingAmount(20, onion)).toBe('1 Stück');
  });

  test('nicht-zählbare Zutat: g und kg ab 1000', () => {
    expect(formatShoppingAmount(250, flour)).toBe('250 g');
    expect(formatShoppingAmount(1500, flour)).toBe('1.5 kg');
    expect(formatShoppingAmount(2000, flour)).toBe('2 kg');
  });

  test('ml-Zutat: ml und l ab 1000', () => {
    expect(formatShoppingAmount(200, mlIngredient)).toBe('200 ml');
    expect(formatShoppingAmount(1000, mlIngredient)).toBe('1 l');
  });

  test('fehlendes Ingredient → fällt auf g zurück (kein Crash)', () => {
    expect(formatShoppingAmount(300, undefined)).toBe('300 g');
  });
});
