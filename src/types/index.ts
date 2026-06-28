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

export type Allergen = (typeof EU14_ALLERGENS)[number];

// Art. 9 DSGVO: halal and kosher are religious data — consent covers all DietOption values
export type DietOption =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher';

export type Goal = 'high_protein' | 'low_carb' | 'lighter' | 'none';

export const EQUIPMENT_OPTIONS = [
  'herdplatte',
  'ofen',
  'mikrowelle',
  'airfryer',
  'wasserkocher',
  'mixer',
  'puerierstab',
  'toaster',
  'sandwichmaker',
  'reiskocher',
] as const;

export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

// Single source of truth for the equipment picker (KuecheScreen): label + icon per option.
// `satisfies` guarantees every value is a valid Equipment, so picker and type can never drift.
export const EQUIPMENT_META = [
  { value: 'herdplatte',    label: 'Herdplatte',    iconKey: 'herdplatte' },
  { value: 'ofen',          label: 'Backofen',      iconKey: 'backofen' },
  { value: 'mikrowelle',    label: 'Mikrowelle',    iconKey: 'mikrowelle' },
  { value: 'airfryer',      label: 'Airfryer',      iconKey: 'airfryer' },
  { value: 'wasserkocher',  label: 'Wasserkocher',  iconKey: 'wasserkocher' },
  { value: 'mixer',         label: 'Mixer',         iconKey: 'mixer' },
  { value: 'puerierstab',   label: 'Pürierstab',    iconKey: 'puerierstab' },
  { value: 'toaster',       label: 'Toaster',       iconKey: 'toaster' },
  { value: 'sandwichmaker', label: 'Sandwichmaker', iconKey: 'sandwichmaker' },
  { value: 'reiskocher',    label: 'Reiskocher',    iconKey: 'reiskocher' },
] as const satisfies ReadonlyArray<{ value: Equipment; label: string; iconKey: string }>;

// Nutrient values per 100g of the ingredient in its reference state (raw or cooked — consistent per ingredient)
export interface NutrientsPer100g {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

export interface Ingredient {
  id: string;
  name: string;
  allergens: Allergen[];
  nutrients_per_100g: NutrientsPer100g;
  base_unit: 'g' | 'ml';
  // Maps unit names to base_unit amounts: e.g. { 'stueck': 110, 'el': 15 }
  unit_conversions: Record<string, number>;
  aisle_category: string;
  is_pantry_staple: boolean;
  animal_origin: 'none' | 'dairy' | 'egg' | 'meat' | 'fish';
}

export type DishUnit = 'g' | 'ml' | 'stueck' | 'el' | 'tl';

export interface DishIngredient {
  ingredient_id: string;
  amount: number;
  unit: DishUnit;
}

export interface Dish {
  id: string;
  variant_group?: string;
  name: string;
  description: string;
  serving_base: number;
  techniques_required: string[];
  technique_taught: string;        // the ONE new skill this dish introduces
  // diet_verified is hand-authored — halal cannot be derived from ingredients
  diet_verified: string[];
  equipment_required: string[][];  // AND of OR-groups: [['ofen','airfryer'], ['herdplatte']]
  equipment_optional: string[];
  ingredients: DishIngredient[];
  allergens: Allergen[];           // computed from ingredients, stored for fast lookup
  time_minutes: number;
  steps: string[];
  image_asset: string;
}

export interface ShoppingItem {
  id: string;
  list_id: string;
  ingredient_id: string;
  ingredient_name: string;
  amount_base: number;
  base_unit: 'g' | 'ml';
  aisle_category: string;
  is_pantry_staple: boolean;
  is_checked: boolean;
}

export interface ShoppingList {
  id: string;
  created_at: string;
  dishes: Array<{ dish_id: string; dish_name: string }>;
  items: ShoppingItem[];
}

export interface UserConsent {
  granted_at: string;   // ISO 8601
  policy_version: string;
}

// Art. 9 DSGVO — all fields stay on device only (SecureStore)
export interface UserProfile {
  id: string;
  consent: UserConsent;
  diet: DietOption;
  allergies: Allergen[];
  goals: Goal[];
  equipment: string[];
  time_budget_min: number;
  skill_techniques: string[];
  cooked_dish_ids: string[];
  favorites: string[];
  created_at: string;
  updated_at: string;
}
