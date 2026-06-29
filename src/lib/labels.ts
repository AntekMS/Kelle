import type { Allergen, DietOption, Goal } from '../types';

// Zentrale, menschenlesbare Anzeige-Labels (DE) für die Enum-Werte des Profils.
// Single source — von AllergenChip, ProfilScreen und (bei Bedarf) Onboarding genutzt.

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  crustaceans: 'Krebstiere',
  eggs: 'Eier',
  fish: 'Fisch',
  peanuts: 'Erdnüsse',
  soybeans: 'Soja',
  milk: 'Milch',
  nuts: 'Schalenfrüchte',
  celery: 'Sellerie',
  mustard: 'Senf',
  sesame: 'Sesam',
  sulphites: 'Sulfite',
  lupin: 'Lupinen',
  molluscs: 'Weichtiere',
};

export const DIET_LABELS: Record<DietOption, string> = {
  omnivore: 'Alles (Standard)',
  vegetarian: 'Vegetarisch',
  vegan: 'Vegan',
  halal: 'Halal',
  kosher: 'Koscher',
};

export const GOAL_LABELS: Record<Goal, string> = {
  none: 'Einfach gut essen',
  high_protein: 'Mehr Protein',
  lighter: 'Leichter essen',
  low_carb: 'Low Carb',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  herdplatte: 'Herdplatte',
  ofen: 'Backofen',
  mikrowelle: 'Mikrowelle',
  airfryer: 'Airfryer',
  wasserkocher: 'Wasserkocher',
  mixer: 'Mixer',
  puerierstab: 'Pürierstab',
  toaster: 'Toaster',
  sandwichmaker: 'Sandwichmaker',
  reiskocher: 'Reiskocher',
};

export function equipmentLabel(value: string): string {
  return EQUIPMENT_LABELS[value] ?? value;
}

export function formatTimeBudget(minutes: number): string {
  if (minutes <= 15) return '< 15 Min';
  if (minutes <= 30) return '~ 30 Min';
  return 'Mehr Zeit';
}
