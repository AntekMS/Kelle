// EU-14 allergen vocabulary — fixed, never extend with free strings
export const EU14_ALLERGENS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soybeans',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;

export type Allergen = typeof EU14_ALLERGENS[number];

export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'omnivore';

// Art. 9 DSGVO — religious dietary restrictions
export type ReligiousRestriction = 'halal' | 'kosher' | 'none';

export interface NutrientsPer100g {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrates_g: number;
  fiber_g: number;
  salt_g: number;
}

export interface Ingredient {
  id: string;
  name: string;
  allergens: Allergen[];
  nutrients_per_100g: NutrientsPer100g;
  // Reference unit for normalization
  base_unit: 'g' | 'ml';
  // Conversion: e.g. "1 Zwiebel" → 110g
  unit_conversions: Record<string, number>;
  aisle_category: string;
}

export type DishState = 'raw' | 'cooked';

export interface DishIngredient {
  ingredient_id: string;
  amount_g: number;
  state: DishState;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  techniques: string[];
  ingredients: DishIngredient[];
  // Computed from ingredients — never set manually
  allergens: Allergen[];
  difficulty: 1 | 2 | 3;
  time_minutes: number;
  image_asset: string;
  diet_tags: DietaryPreference[];
}

export interface UserConsent {
  timestamp: string; // ISO 8601
  policy_version: string;
  granted: boolean;
}

// Art. 9 DSGVO — sensitive data, stays on device only
export interface UserProfile {
  id: string;
  consent: UserConsent;
  allergies: Allergen[];
  diet: DietaryPreference;
  religious_restriction: ReligiousRestriction;
  // Dishes the user has cooked
  cooked_dish_ids: string[];
  created_at: string;
  updated_at: string;
}
