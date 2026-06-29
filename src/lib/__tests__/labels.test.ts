import { EU14_ALLERGENS } from '../../types';
import type { DietOption, Goal } from '../../types';
import {
  ALLERGEN_LABELS,
  DIET_LABELS,
  GOAL_LABELS,
  equipmentLabel,
  formatTimeBudget,
} from '../labels';

describe('Label-Maps Vollständigkeit', () => {
  test('jedes EU-14-Allergen hat ein nicht-leeres Label', () => {
    for (const a of EU14_ALLERGENS) {
      expect(ALLERGEN_LABELS[a]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  test('jede DietOption hat ein nicht-leeres Label', () => {
    const diets: DietOption[] = ['omnivore', 'vegetarian', 'vegan', 'halal', 'kosher'];
    for (const d of diets) {
      expect(DIET_LABELS[d]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  test('jedes Goal hat ein nicht-leeres Label', () => {
    const goals: Goal[] = ['none', 'high_protein', 'low_carb', 'lighter'];
    for (const g of goals) {
      expect(GOAL_LABELS[g]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('equipmentLabel', () => {
  test('bekannter Wert → Label aus EQUIPMENT_META', () => {
    expect(equipmentLabel('toaster')).toBe('Toaster');
    expect(equipmentLabel('herdplatte')).toBe('Herdplatte');
  });

  test('unbekannter Wert → Rohwert (kein Crash)', () => {
    expect(equipmentLabel('unbekannt')).toBe('unbekannt');
  });
});

describe('formatTimeBudget', () => {
  test('Schwellen 15 / 30 / mehr', () => {
    expect(formatTimeBudget(15)).toBe('< 15 Min');
    expect(formatTimeBudget(30)).toBe('~ 30 Min');
    expect(formatTimeBudget(60)).toBe('Mehr Zeit');
  });

  test('Zwischenwerte runden zur passenden Stufe', () => {
    expect(formatTimeBudget(20)).toBe('~ 30 Min');
    expect(formatTimeBudget(100)).toBe('Mehr Zeit');
  });
});
