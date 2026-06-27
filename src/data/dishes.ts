import type { Dish } from '../types';

// Hand-curated dishes — 15–25 total in the final MVP.
// Allergens are computed from ingredients (computeDishAllergens), NOT set manually here.
// Each dish teaches one new cooking technique over the previous ones.
export const DISHES: Dish[] = [
  {
    id: 'dish-scrambled-eggs',
    name: 'Rührei',
    description: 'Das erste Fundament: Eier richtig garen — weich, cremig, nicht gummiartig.',
    techniques: ['rühren', 'niedrige-hitze'],
    ingredients: [
      { ingredient_id: 'ing-eggs', amount_g: 120, state: 'raw' },
      { ingredient_id: 'ing-butter', amount_g: 10, state: 'raw' },
      { ingredient_id: 'ing-salt', amount_g: 2, state: 'raw' },
    ],
    allergens: ['eggs', 'milk'],
    difficulty: 1,
    time_minutes: 10,
    image_asset: 'scrambled_eggs',
    diet_tags: ['vegetarian'],
  },
  {
    id: 'dish-pasta-aglio',
    name: 'Pasta Aglio e Olio',
    description: 'Geschmack durch Technik: Knoblauch in Öl aromatisieren, nicht verbrennen.',
    techniques: ['kochen', 'aromatisieren', 'emulgieren'],
    ingredients: [
      { ingredient_id: 'ing-spaghetti', amount_g: 80, state: 'raw' },
      { ingredient_id: 'ing-garlic', amount_g: 10, state: 'raw' },
      { ingredient_id: 'ing-olive-oil', amount_g: 20, state: 'raw' },
      { ingredient_id: 'ing-chili-flakes', amount_g: 1, state: 'raw' },
      { ingredient_id: 'ing-parsley', amount_g: 5, state: 'raw' },
      { ingredient_id: 'ing-salt', amount_g: 3, state: 'raw' },
    ],
    allergens: ['gluten'],
    difficulty: 1,
    time_minutes: 20,
    image_asset: 'pasta_aglio',
    diet_tags: ['vegan'],
  },
  // TODO: Add remaining 13–23 dishes following the learning progression
];
