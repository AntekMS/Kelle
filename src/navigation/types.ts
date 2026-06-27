import type { Allergen, DietaryPreference, ReligiousRestriction } from '../types';

export type OnboardingStackParamList = {
  Welcome: undefined;
  AllergenSetup: undefined;
  ConsentScreen: {
    allergies: Allergen[];
    diet: DietaryPreference;
    religious_restriction: ReligiousRestriction;
  };
};

export type MainStackParamList = {
  Feed: undefined;
};
