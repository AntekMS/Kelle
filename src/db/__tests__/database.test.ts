import type { Dish, Ingredient } from '../../types';

// ── Mock expo-sqlite ──────────────────────────────────────────────────────────
// mockDb is defined here and referenced by closure inside openDatabaseSync.
// The singleton in database.ts is reset via _resetDbForTests() in beforeEach.

type MockDb = {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
};

let mockDb: MockDb;

jest.mock('expo-sqlite', () => ({
  // Factory closure — mockDb is captured by reference, set in beforeEach
  openDatabaseSync: jest.fn(() => mockDb),
}));

import {
  normalizeToBase,
  _resetDbForTests,
  getAllDishes,
  getAllIngredients,
  getOrCreateActiveList,
  getActiveDishIds,
  seedDishes,
  seedIngredients,
} from '../database';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleIngredient: Ingredient = {
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

const sampleDish: Dish = {
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

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetDbForTests();
  mockDb = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => fn()),
  };
});

// ── normalizeToBase ───────────────────────────────────────────────────────────

describe('normalizeToBase', () => {
  test('gleiche Einheit wie base_unit → Passthrough ohne Konversion', () => {
    expect(normalizeToBase(250, 'ml', sampleIngredient)).toBe(250);
  });

  test('el → ml über unit_conversions (el=15)', () => {
    expect(normalizeToBase(2, 'el', sampleIngredient)).toBe(30);
  });

  test('tl → ml über unit_conversions (tl=5)', () => {
    expect(normalizeToBase(3, 'tl', sampleIngredient)).toBe(15);
  });

  test('unbekannte Einheit → gibt amount zurück (kein Crash)', () => {
    // Factor is undefined → falls back to amount unchanged
    expect(normalizeToBase(100, 'unbekannt', sampleIngredient)).toBe(100);
  });

  test('Menge 0 → 0', () => {
    expect(normalizeToBase(0, 'el', sampleIngredient)).toBe(0);
  });

  test('g-Einheit für g-Zutat → Passthrough', () => {
    const gIngredient: Ingredient = { ...sampleIngredient, base_unit: 'g', unit_conversions: { stueck: 55 } };
    expect(normalizeToBase(100, 'g', gIngredient)).toBe(100);
  });

  test('stueck → g wenn Konversionsfaktor vorhanden', () => {
    const eggIngredient: Ingredient = {
      ...sampleIngredient,
      base_unit: 'g',
      unit_conversions: { stueck: 55 },
    };
    expect(normalizeToBase(2, 'stueck', eggIngredient)).toBe(110);
  });
});

// ── getAllDishes ──────────────────────────────────────────────────────────────

describe('getAllDishes', () => {
  test('gibt leeres Array zurück wenn keine Gerichte in DB', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const result = await getAllDishes();
    expect(result).toEqual([]);
  });

  test('parst JSON-Daten aus der Datenbank korrekt', async () => {
    mockDb.getAllAsync.mockResolvedValue([{ data: JSON.stringify(sampleDish) }]);
    const result = await getAllDishes();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(sampleDish);
  });

  test('parst mehrere Gerichte korrekt', async () => {
    const dish2: Dish = { ...sampleDish, id: 'd2', name: 'Omelette' };
    mockDb.getAllAsync.mockResolvedValue([
      { data: JSON.stringify(sampleDish) },
      { data: JSON.stringify(dish2) },
    ]);
    const result = await getAllDishes();
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Omelette');
  });
});

// ── getAllIngredients ─────────────────────────────────────────────────────────

describe('getAllIngredients', () => {
  test('gibt leeres Array zurück wenn keine Zutaten in DB', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const result = await getAllIngredients();
    expect(result).toEqual([]);
  });

  test('parst JSON-Daten aus der Datenbank korrekt', async () => {
    mockDb.getAllAsync.mockResolvedValue([{ data: JSON.stringify(sampleIngredient) }]);
    const result = await getAllIngredients();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(sampleIngredient);
  });
});

// ── getOrCreateActiveList ─────────────────────────────────────────────────────

describe('getOrCreateActiveList', () => {
  test('gibt ACTIVE_LIST_ID zurück wenn Liste bereits existiert', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ id: 'active' });
    const result = await getOrCreateActiveList();
    expect(result).toBe('active');
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  test('erstellt neue Liste wenn keine vorhanden und gibt ID zurück', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getOrCreateActiveList();
    expect(result).toBe('active');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO shopping_lists'),
      'active',
      expect.any(String)
    );
  });
});

// ── getActiveDishIds ──────────────────────────────────────────────────────────

describe('getActiveDishIds', () => {
  test('gibt leeres Array zurück wenn keine Gerichte in Liste', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const result = await getActiveDishIds();
    expect(result).toEqual([]);
  });

  test('gibt Dish-IDs aus shopping_list_dishes zurück', async () => {
    mockDb.getAllAsync.mockResolvedValue([{ dish_id: 'd1' }, { dish_id: 'd2' }]);
    const result = await getActiveDishIds();
    expect(result).toEqual(['d1', 'd2']);
  });
});

// ── seedDishes ────────────────────────────────────────────────────────────────

describe('seedDishes', () => {
  test('schreibt jedes Gericht als JSON in die Datenbank', async () => {
    await seedDishes([sampleDish]);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO dishes'),
      sampleDish.id,
      JSON.stringify(sampleDish),
      expect.any(String)
    );
  });
});

// ── seedIngredients ───────────────────────────────────────────────────────────

describe('seedIngredients', () => {
  test('schreibt jede Zutat als JSON in die Datenbank', async () => {
    await seedIngredients([sampleIngredient]);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO ingredients'),
      sampleIngredient.id,
      JSON.stringify(sampleIngredient),
      expect.any(String)
    );
  });
});
