import type { Dish } from '../../../types';
import { partitionByCooked } from '../feed-sections';

function dish(id: string): Dish {
  return {
    id,
    name: id,
    description: '',
    serving_base: 1,
    techniques_required: [],
    technique_taught: '',
    diet_verified: [],
    equipment_required: [],
    equipment_optional: [],
    ingredients: [],
    allergens: [],
    time_minutes: 10,
    steps: [],
    image_asset: '',
  };
}

describe('partitionByCooked', () => {
  test('teilt nach cookedIds und bewahrt die Reihenfolge', () => {
    const dishes = [dish('a'), dish('b'), dish('c'), dish('d')];
    const { forYou, cooked } = partitionByCooked(dishes, ['b', 'd']);
    expect(forYou.map((d) => d.id)).toEqual(['a', 'c']);
    expect(cooked.map((d) => d.id)).toEqual(['b', 'd']);
  });

  test('keine gekochten → alles in forYou', () => {
    const dishes = [dish('a'), dish('b')];
    const { forYou, cooked } = partitionByCooked(dishes, []);
    expect(forYou).toHaveLength(2);
    expect(cooked).toHaveLength(0);
  });

  test('alle gekocht → alles in cooked', () => {
    const dishes = [dish('a'), dish('b')];
    const { forYou, cooked } = partitionByCooked(dishes, ['a', 'b']);
    expect(forYou).toHaveLength(0);
    expect(cooked.map((d) => d.id)).toEqual(['a', 'b']);
  });

  test('leere Liste → leere Gruppen', () => {
    const { forYou, cooked } = partitionByCooked([], ['x']);
    expect(forYou).toHaveLength(0);
    expect(cooked).toHaveLength(0);
  });
});
