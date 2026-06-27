import type { Dish, UserProfile } from '../../../types';
import {
  computeDishAllergens,
  filterCompatibleDishes,
  isDishAllergenSafe,
  isDishDietCompatible,
  isDishEquipmentPossible,
  isDishTimeCompatible,
} from '../allergen-filter';

const baseDish: Dish = {
  id: 'd1',
  name: 'Test Dish',
  description: '',
  serving_base: 1,
  techniques_required: [],
  technique_taught: 'kochen',
  diet_verified: ['vegan', 'vegetarian'],
  equipment_required: [['herdplatte']],
  equipment_optional: [],
  ingredients: [],
  allergens: [],
  time_minutes: 20,
  steps: [],
  image_asset: '',
};

const baseProfile: UserProfile = {
  id: 'u1',
  consent: { granted_at: '2026-01-01T00:00:00Z', policy_version: '1.0' },
  diet: 'omnivore',
  allergies: [],
  goals: ['none'],
  equipment: ['herdplatte'],
  time_budget_min: 30,
  skill_techniques: [],
  cooked_dish_ids: [],
  favorites: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── computeDishAllergens ──────────────────────────────────────────────────

describe('computeDishAllergens', () => {
  it('returns empty set when no ingredients have allergens', () => {
    expect(computeDishAllergens([[], []])).toEqual([]);
  });

  it('returns union of all ingredient allergens', () => {
    const result = computeDishAllergens([['gluten', 'eggs'], ['milk']]);
    expect(result).toEqual(expect.arrayContaining(['gluten', 'eggs', 'milk']));
    expect(result).toHaveLength(3);
  });

  it('deduplicates allergens appearing in multiple ingredients', () => {
    const result = computeDishAllergens([['gluten'], ['gluten', 'eggs']]);
    expect(result).toHaveLength(2);
    expect(result).toContain('gluten');
    expect(result).toContain('eggs');
  });
});

// ── isDishAllergenSafe — hard gate ────────────────────────────────────────

describe('isDishAllergenSafe — hard gate', () => {
  it('passes a dish when user has no allergies', () => {
    const dish: Dish = { ...baseDish, allergens: ['peanuts'] };
    expect(isDishAllergenSafe(dish, [])).toBe(true);
  });

  it('blocks a dish when it contains a user allergen', () => {
    const dish: Dish = { ...baseDish, allergens: ['peanuts', 'gluten'] };
    expect(isDishAllergenSafe(dish, ['peanuts'])).toBe(false);
  });

  it('passes a dish that shares no allergens with user', () => {
    const dish: Dish = { ...baseDish, allergens: ['gluten'] };
    expect(isDishAllergenSafe(dish, ['peanuts'])).toBe(true);
  });

  // Critical invariant
  it('peanut-allergy profile never sees a dish with peanuts', () => {
    const peanutDish: Dish = { ...baseDish, id: 'peanut', allergens: ['peanuts'] };
    const safeDish: Dish = { ...baseDish, id: 'safe', allergens: ['gluten'] };
    const profile: UserProfile = { ...baseProfile, allergies: ['peanuts'] };
    const result = filterCompatibleDishes([peanutDish, safeDish], profile);
    expect(result.map((d) => d.id)).not.toContain('peanut');
    expect(result.map((d) => d.id)).toContain('safe');
  });
});

// ── isDishDietCompatible ──────────────────────────────────────────────────

describe('isDishDietCompatible', () => {
  it('omnivore sees everything', () => {
    expect(isDishDietCompatible(baseDish, 'omnivore')).toBe(true);
  });

  it('vegetarian sees vegetarian dishes', () => {
    expect(isDishDietCompatible(baseDish, 'vegetarian')).toBe(true);
  });

  it('vegan sees vegan dishes', () => {
    expect(isDishDietCompatible(baseDish, 'vegan')).toBe(true);
  });

  it('halal does not see non-verified dish', () => {
    // baseDish.diet_verified = ['vegan','vegetarian'] — halal not in it
    expect(isDishDietCompatible(baseDish, 'halal')).toBe(false);
  });

  it('halal sees a halal-verified dish', () => {
    const halalDish: Dish = { ...baseDish, diet_verified: ['vegan', 'vegetarian', 'halal'] };
    expect(isDishDietCompatible(halalDish, 'halal')).toBe(true);
  });
});

// ── isDishEquipmentPossible ───────────────────────────────────────────────

describe('isDishEquipmentPossible', () => {
  it('passes when user has required equipment', () => {
    expect(isDishEquipmentPossible(baseDish, ['herdplatte'])).toBe(true);
  });

  it('blocks when required equipment is missing', () => {
    expect(isDishEquipmentPossible(baseDish, ['ofen'])).toBe(false);
  });

  it('OR-group: passes when user has one option from the group', () => {
    const dish: Dish = { ...baseDish, equipment_required: [['ofen', 'airfryer'], ['herdplatte']] };
    expect(isDishEquipmentPossible(dish, ['airfryer', 'herdplatte'])).toBe(true);
  });

  it('OR-group: fails when no option in a group is available', () => {
    const dish: Dish = { ...baseDish, equipment_required: [['ofen', 'airfryer'], ['herdplatte']] };
    expect(isDishEquipmentPossible(dish, ['herdplatte'])).toBe(false);
  });

  it('passes when no equipment is required', () => {
    const dish: Dish = { ...baseDish, equipment_required: [] };
    expect(isDishEquipmentPossible(dish, [])).toBe(true);
  });
});

// ── isDishTimeCompatible ──────────────────────────────────────────────────

describe('isDishTimeCompatible', () => {
  it('passes a dish within budget', () => {
    expect(isDishTimeCompatible({ ...baseDish, time_minutes: 20 }, 30)).toBe(true);
  });

  it('passes a dish within 20% tolerance', () => {
    expect(isDishTimeCompatible({ ...baseDish, time_minutes: 17 }, 15)).toBe(true); // 15×1.2=18
  });

  it('blocks a dish well over budget', () => {
    expect(isDishTimeCompatible({ ...baseDish, time_minutes: 60 }, 15)).toBe(false);
  });
});

// ── filterCompatibleDishes — combined ────────────────────────────────────

describe('filterCompatibleDishes', () => {
  it('returns all dishes for omnivore with no allergies and matching equipment', () => {
    const dishes = [baseDish, { ...baseDish, id: 'd2' }];
    expect(filterCompatibleDishes(dishes, baseProfile)).toHaveLength(2);
  });

  it('filters out dishes failing any single criterion', () => {
    const allergyDish: Dish = { ...baseDish, id: 'allergy', allergens: ['peanuts'] };
    const dietDish: Dish = { ...baseDish, id: 'diet', diet_verified: [] };
    const equipDish: Dish = { ...baseDish, id: 'equip', equipment_required: [['ofen']] };
    const timeDish: Dish = { ...baseDish, id: 'time', time_minutes: 90 };

    const profile: UserProfile = { ...baseProfile, allergies: ['peanuts'], diet: 'vegan' };
    const result = filterCompatibleDishes(
      [baseDish, allergyDish, dietDish, equipDish, timeDish],
      profile
    );
    // baseDish: vegan ✓, no peanuts ✓, has herdplatte ✓, 20 min ✓
    expect(result.map((d) => d.id)).toEqual(['d1']);
  });
});
