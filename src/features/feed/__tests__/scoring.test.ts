import type { Dish, Goal, Ingredient, UserProfile } from '../../../types';
import { scoreDish, rankDishes } from '../scoring';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const proteinIngredient: Ingredient = {
  id: 'ing_protein',
  name: 'Hähnchenbrust',
  allergens: [],
  nutrients_per_100g: { kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0, fiber_g: 0 },
  base_unit: 'g',
  unit_conversions: { stueck: 150, el: 15 },
  aisle_category: 'Fleisch',
  is_pantry_staple: false,
  animal_origin: 'meat',
};

const carbIngredient: Ingredient = {
  id: 'ing_carb',
  name: 'Pasta',
  allergens: ['gluten'],
  nutrients_per_100g: { kcal: 350, protein_g: 12, fat_g: 1.5, carbs_g: 70, fiber_g: 3 },
  base_unit: 'g',
  unit_conversions: {},
  aisle_category: 'Nudeln',
  is_pantry_staple: true,
  animal_origin: 'none',
};

const baseDish: Dish = {
  id: 'd1',
  name: 'Hähnchenpfanne',
  description: '',
  serving_base: 1,
  techniques_required: [],
  technique_taught: 'braten',
  diet_verified: [],
  equipment_required: [['herdplatte']],
  equipment_optional: [],
  ingredients: [{ ingredient_id: 'ing_protein', amount: 100, unit: 'g' }],
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
  skill_techniques: ['braten'],
  cooked_dish_ids: [],
  favorites: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const ingredientMap = new Map<string, Ingredient>([
  ['ing_protein', proteinIngredient],
  ['ing_carb', carbIngredient],
]);

// ── scoreDish: Machbarkeit ────────────────────────────────────────────────────

describe('scoreDish — Machbarkeit', () => {
  test('bekannte Technik → Faktor 0.8', () => {
    // technique_taught = 'braten', skill_techniques includes 'braten' → isNew = false
    const score = scoreDish(baseDish, baseProfile, ingredientMap);
    // zielFit=1.0, machbarkeit=0.8, repetition=1.0, bonuses=0
    expect(score).toBeCloseTo(0.8);
  });

  test('neue Technik → Faktor 1.0', () => {
    const profile = { ...baseProfile, skill_techniques: [] };
    const score = scoreDish(baseDish, profile, ingredientMap);
    expect(score).toBeCloseTo(1.0);
  });

  test('neue Technik hat höheren Score als bekannte Technik', () => {
    const profileNew = { ...baseProfile, skill_techniques: [] };
    const profileKnown = { ...baseProfile, skill_techniques: ['braten'] };
    expect(scoreDish(baseDish, profileNew, ingredientMap)).toBeGreaterThan(
      scoreDish(baseDish, profileKnown, ingredientMap)
    );
  });
});

// ── scoreDish: Machbarkeit über techniques_required ──────────────────────────

describe('scoreDish — Machbarkeit zählt techniques_required', () => {
  // Dish that demands real prerequisite techniques on top of the one it teaches.
  const multiTechDish: Dish = {
    ...baseDish,
    id: 'd_multi',
    techniques_required: ['niedrige-hitze', 'aromatisieren'],
    technique_taught: 'sauce',
  };

  test('Anfänger (kein Können) → 3 neue Techniken → Faktor 0.1', () => {
    const profile = { ...baseProfile, goals: ['none'] as Goal[], skill_techniques: [] };
    // involved = {niedrige-hitze, aromatisieren, sauce} → 3 neu → 0.1
    const score = scoreDish(multiTechDish, profile, ingredientMap);
    expect(score).toBeCloseTo(0.1);
  });

  test('2 neue Techniken → Faktor 0.4', () => {
    // user already knows the taught technique, so only the 2 required ones are new
    const profile = { ...baseProfile, goals: ['none'] as Goal[], skill_techniques: ['sauce'] };
    const score = scoreDish(multiTechDish, profile, ingredientMap);
    expect(score).toBeCloseTo(0.4);
  });

  test('bekannte Vorkenntnisse senken die Anzahl neuer Techniken', () => {
    // knows 2 of 3 → only 1 new → 1.0
    const profile = {
      ...baseProfile,
      goals: ['none'] as Goal[],
      skill_techniques: ['niedrige-hitze', 'aromatisieren'],
    };
    const score = scoreDish(multiTechDish, profile, ingredientMap);
    expect(score).toBeCloseTo(1.0);
  });

  test('alle Techniken bekannt → 0 neu → Faktor 0.8', () => {
    const profile = {
      ...baseProfile,
      goals: ['none'] as Goal[],
      skill_techniques: ['niedrige-hitze', 'aromatisieren', 'sauce'],
    };
    const score = scoreDish(multiTechDish, profile, ingredientMap);
    expect(score).toBeCloseTo(0.8);
  });

  test('Anfänger wird ein anspruchsvolles Gericht NICHT vor ein einfaches gereiht', () => {
    const profile = { ...baseProfile, goals: ['none'] as Goal[], skill_techniques: [] };
    const simpleDish: Dish = {
      ...baseDish,
      id: 'd_simple',
      techniques_required: [],
      technique_taught: 'kochen',
    };
    const ranked = rankDishes([multiTechDish, simpleDish], profile, [proteinIngredient]);
    expect(ranked[0].id).toBe('d_simple');
  });
});

// ── scoreDish: Repetition ─────────────────────────────────────────────────────

describe('scoreDish — Repetition Penalty', () => {
  test('bereits gekochtes Gericht → Faktor 0.7', () => {
    const profile = { ...baseProfile, cooked_dish_ids: ['d1'] };
    const uncooked = scoreDish(baseDish, baseProfile, ingredientMap);
    const cooked = scoreDish(baseDish, profile, ingredientMap);
    expect(cooked).toBeCloseTo(uncooked * 0.7);
  });

  test('nicht gekochtes Gericht → kein Penalty (Faktor 1.0)', () => {
    const profile = { ...baseProfile, cooked_dish_ids: ['anderes_gericht'] };
    const score = scoreDish(baseDish, profile, ingredientMap);
    expect(score).toBeCloseTo(0.8);
  });
});

// ── scoreDish: FavBonus ───────────────────────────────────────────────────────

describe('scoreDish — FavBonus', () => {
  test('Favorit → +0.08', () => {
    const profile = { ...baseProfile, favorites: ['d1'] };
    const normal = scoreDish(baseDish, baseProfile, ingredientMap);
    const fav = scoreDish(baseDish, profile, ingredientMap);
    expect(fav - normal).toBeCloseTo(0.08);
  });

  test('nicht in Favoriten → kein Bonus', () => {
    const profile = { ...baseProfile, favorites: ['anderes_gericht'] };
    const score = scoreDish(baseDish, profile, ingredientMap);
    expect(score).toBeCloseTo(0.8);
  });
});

// ── scoreDish: OverlapBonus ───────────────────────────────────────────────────

describe('scoreDish — OverlapBonus', () => {
  test('100% Überlappung → +0.12', () => {
    const active = new Set(['ing_protein']);
    const without = scoreDish(baseDish, baseProfile, ingredientMap);
    const with_ = scoreDish(baseDish, baseProfile, ingredientMap, active);
    expect(with_ - without).toBeCloseTo(0.12);
  });

  test('50% Überlappung → +0.06', () => {
    const twoDish: Dish = {
      ...baseDish,
      ingredients: [
        { ingredient_id: 'ing_protein', amount: 100, unit: 'g' },
        { ingredient_id: 'ing_carb', amount: 100, unit: 'g' },
      ],
    };
    const active = new Set(['ing_protein']);
    const without = scoreDish(twoDish, baseProfile, ingredientMap);
    const with_ = scoreDish(twoDish, baseProfile, ingredientMap, active);
    expect(with_ - without).toBeCloseTo(0.06);
  });

  test('keine aktive Liste → kein Bonus', () => {
    const score = scoreDish(baseDish, baseProfile, ingredientMap, new Set());
    expect(score).toBeCloseTo(0.8);
  });

  test('keine Überlappung → kein Bonus', () => {
    const active = new Set(['ing_nicht_vorhanden']);
    const without = scoreDish(baseDish, baseProfile, ingredientMap);
    const with_ = scoreDish(baseDish, baseProfile, ingredientMap, active);
    expect(with_).toBeCloseTo(without);
  });
});

// ── scoreDish: ZielFit ────────────────────────────────────────────────────────

describe('scoreDish — ZielFit', () => {
  test('goals=["none"] → zielFit=1.0, keine Dämpfung', () => {
    const profile = { ...baseProfile, goals: ['none'] as Goal[] };
    const score = scoreDish(baseDish, profile, ingredientMap);
    // machbarkeit=0.8 × zielFit=1.0 × repetition=1.0
    expect(score).toBeCloseTo(0.8);
  });

  test('goals=[] → zielFit=1.0', () => {
    const profile = { ...baseProfile, goals: [] as Goal[] };
    const score = scoreDish(baseDish, profile, ingredientMap);
    expect(score).toBeCloseTo(0.8);
  });

  test('high_protein: proteinreiches Gericht schlägt kohlenhydratreiches', () => {
    const profile = { ...baseProfile, goals: ['high_protein'] as Goal[], skill_techniques: [] };
    const carbDish: Dish = {
      ...baseDish,
      id: 'd2',
      ingredients: [{ ingredient_id: 'ing_carb', amount: 100, unit: 'g' }],
    };
    const proteinScore = scoreDish(baseDish, profile, ingredientMap);
    const carbScore = scoreDish(carbDish, profile, ingredientMap);
    expect(proteinScore).toBeGreaterThan(carbScore);
  });

  test('low_carb: kohlenhydratarmes Gericht schlägt kohlenhydratreiches', () => {
    const profile = { ...baseProfile, goals: ['low_carb'] as Goal[], skill_techniques: [] };
    const carbDish: Dish = {
      ...baseDish,
      id: 'd2',
      ingredients: [{ ingredient_id: 'ing_carb', amount: 100, unit: 'g' }],
    };
    const lowCarbScore = scoreDish(baseDish, profile, ingredientMap);
    const highCarbScore = scoreDish(carbDish, profile, ingredientMap);
    expect(lowCarbScore).toBeGreaterThan(highCarbScore);
  });

  test('lighter: kalorienarmes Gericht hat höheren Score als kalorienreiches', () => {
    const profile = { ...baseProfile, goals: ['lighter'] as Goal[], skill_techniques: [] };

    const heavyIngredient: Ingredient = {
      ...proteinIngredient,
      id: 'ing_heavy',
      nutrients_per_100g: { kcal: 900, protein_g: 5, fat_g: 80, carbs_g: 5, fiber_g: 0 },
    };
    const heavyMap = new Map([...ingredientMap, ['ing_heavy', heavyIngredient]]);
    const heavyDish: Dish = {
      ...baseDish,
      id: 'd_heavy',
      ingredients: [{ ingredient_id: 'ing_heavy', amount: 100, unit: 'g' }],
    };

    const lightScore = scoreDish(baseDish, profile, ingredientMap);
    const heavyScore = scoreDish(heavyDish, profile, heavyMap);
    expect(lightScore).toBeGreaterThan(heavyScore);
  });

  test('zielFit bleibt in [0.7, 1.0]', () => {
    const profiles = [
      { ...baseProfile, goals: ['high_protein'] as Goal[] },
      { ...baseProfile, goals: ['low_carb'] as Goal[] },
      { ...baseProfile, goals: ['lighter'] as Goal[] },
    ];
    for (const profile of profiles) {
      const score = scoreDish(baseDish, profile, ingredientMap);
      // Score = zielFit × machbarkeit (0.8). Minimum: 0.7 × 0.8 = 0.56
      expect(score).toBeGreaterThanOrEqual(0.56);
      expect(score).toBeLessThanOrEqual(1.0 + 0.08 + 0.12); // max with all bonuses
    }
  });

  test('leere ingredientMap → kein Crash, Score gültig', () => {
    const emptyMap = new Map<string, Ingredient>();
    const profile = { ...baseProfile, goals: ['high_protein'] as Goal[] };
    const score = scoreDish(baseDish, profile, emptyMap);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });
});

// ── rankDishes ────────────────────────────────────────────────────────────────

describe('rankDishes', () => {
  const dish1: Dish = { ...baseDish, id: 'd1' };
  const dish2: Dish = { ...baseDish, id: 'd2' };

  test('leeres Array → leeres Array', () => {
    expect(rankDishes([], baseProfile, [])).toEqual([]);
  });

  test('Favorit landet vor Nicht-Favorit (sonst identisch)', () => {
    const profile = { ...baseProfile, favorites: ['d1'] };
    const ranked = rankDishes([dish2, dish1], profile, [proteinIngredient]);
    expect(ranked[0].id).toBe('d1');
  });

  test('bereits gekochtes Gericht landet weiter hinten', () => {
    const profile = { ...baseProfile, cooked_dish_ids: ['d1'] };
    const ranked = rankDishes([dish1, dish2], profile, [proteinIngredient]);
    expect(ranked[0].id).toBe('d2');
  });

  test('Reihenfolge ist stabil — gibt immer alle Gerichte zurück', () => {
    const dishes = [dish1, dish2];
    const ranked = rankDishes(dishes, baseProfile, [proteinIngredient]);
    expect(ranked).toHaveLength(2);
  });

  test('original Array wird nicht mutiert', () => {
    const dishes = [dish1, dish2];
    const profile = { ...baseProfile, favorites: ['d2'] };
    rankDishes(dishes, profile, [proteinIngredient]);
    expect(dishes[0].id).toBe('d1');
  });
});
