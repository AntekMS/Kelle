import type { Dish } from '../../../types';
import { partitionByCooked, stabilizeRanking } from '../feed-sections';

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

describe('stabilizeRanking (#44)', () => {
  test('bewahrt die bisherige Reihenfolge, auch wenn das Ranking sie ändern würde', () => {
    const prev = [dish('a'), dish('b'), dish('c')];
    const next = [dish('c'), dish('a'), dish('b')]; // Re-Ranking hätte c hochsortiert
    expect(stabilizeRanking(prev, next).map((d) => d.id)).toEqual(['a', 'b', 'c']);
  });

  test('neu kompatible Gerichte werden hinten in Ranking-Reihenfolge angefügt', () => {
    const prev = [dish('a'), dish('b')];
    const next = [dish('x'), dish('a'), dish('y'), dish('b')];
    expect(stabilizeRanking(prev, next).map((d) => d.id)).toEqual(['a', 'b', 'x', 'y']);
  });

  test('herausgefilterte Gerichte fallen raus (harter Filter gewinnt)', () => {
    const prev = [dish('a'), dish('b'), dish('c')];
    const next = [dish('c'), dish('a')]; // b z. B. durch neue Allergie gefiltert
    expect(stabilizeRanking(prev, next).map((d) => d.id)).toEqual(['a', 'c']);
  });

  test('liefert die frischen Dish-Objekte aus nextRanked, nicht die alten', () => {
    const prev = [dish('a')];
    const freshA = { ...dish('a'), name: 'frisch' };
    const result = stabilizeRanking(prev, [freshA]);
    expect(result[0]).toBe(freshA);
  });

  test('leere vorherige Reihenfolge → komplette Ranking-Reihenfolge', () => {
    const next = [dish('b'), dish('a')];
    expect(stabilizeRanking([], next).map((d) => d.id)).toEqual(['b', 'a']);
  });
});
