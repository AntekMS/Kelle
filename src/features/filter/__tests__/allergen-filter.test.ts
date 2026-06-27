import type { Dish, UserProfile } from '../../../types';
import {
  computeDishAllergens,
  filterSafeDishes,
  isDishSafe,
} from '../allergen-filter';

const baseDish: Dish = {
  id: 'd1',
  name: 'Test Dish',
  description: '',
  techniques: [],
  ingredients: [],
  allergens: [],
  difficulty: 1,
  time_minutes: 30,
  image_asset: '',
  diet_tags: ['vegetarian'],
};

const baseProfile: UserProfile = {
  id: 'u1',
  consent: { timestamp: '2026-01-01T00:00:00Z', policy_version: '1.0', granted: true },
  allergies: [],
  diet: 'omnivore',
  religious_restriction: 'none',
  cooked_dish_ids: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

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

describe('isDishSafe — hard gate', () => {
  it('passes a dish when user has no allergies', () => {
    const dish: Dish = { ...baseDish, allergens: ['peanuts'] };
    expect(isDishSafe(dish, baseProfile)).toBe(true);
  });

  it('blocks a dish when it contains a user allergen', () => {
    const dish: Dish = { ...baseDish, allergens: ['peanuts', 'gluten'] };
    const profile: UserProfile = { ...baseProfile, allergies: ['peanuts'] };
    expect(isDishSafe(dish, profile)).toBe(false);
  });

  it('passes a dish that shares no allergens with user profile', () => {
    const dish: Dish = { ...baseDish, allergens: ['gluten'] };
    const profile: UserProfile = { ...baseProfile, allergies: ['peanuts'] };
    expect(isDishSafe(dish, profile)).toBe(true);
  });

  // Critical invariant: a dish with peanut allergen MUST NEVER reach user who avoids peanuts
  it('peanut-allergy profile never sees a dish with peanuts', () => {
    const peanutDish: Dish = { ...baseDish, id: 'peanut-dish', allergens: ['peanuts'] };
    const safeDish: Dish = { ...baseDish, id: 'safe-dish', allergens: ['gluten'] };
    const profile: UserProfile = { ...baseProfile, allergies: ['peanuts'] };
    const result = filterSafeDishes([peanutDish, safeDish], profile);
    expect(result.map((d) => d.id)).not.toContain('peanut-dish');
    expect(result.map((d) => d.id)).toContain('safe-dish');
  });
});

describe('filterSafeDishes', () => {
  it('returns all dishes when profile has no allergies', () => {
    const dishes: Dish[] = [
      { ...baseDish, id: 'd1', allergens: ['gluten'] },
      { ...baseDish, id: 'd2', allergens: ['milk'] },
    ];
    expect(filterSafeDishes(dishes, baseProfile)).toHaveLength(2);
  });

  it('filters out all unsafe dishes', () => {
    const dishes: Dish[] = [
      { ...baseDish, id: 'd1', allergens: ['gluten', 'eggs'] },
      { ...baseDish, id: 'd2', allergens: ['milk'] },
      { ...baseDish, id: 'd3', allergens: [] },
    ];
    const profile: UserProfile = { ...baseProfile, allergies: ['gluten', 'milk'] };
    const result = filterSafeDishes(dishes, profile);
    expect(result.map((d) => d.id)).toEqual(['d3']);
  });
});
