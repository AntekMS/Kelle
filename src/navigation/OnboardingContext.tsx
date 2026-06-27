import { createContext, useContext, useState } from 'react';
import type { Allergen, DietOption, Goal } from '../types';

export interface OnboardingData {
  goals: Goal[];
  equipment: string[];
  time_budget_min: number;
  skill_techniques: string[];
  diet: DietOption;
  allergies: Allergen[];
}

const DEFAULTS: OnboardingData = {
  goals: ['none'],
  equipment: ['herdplatte'],
  time_budget_min: 30,
  skill_techniques: [],
  diet: 'omnivore',
  allergies: [],
};

interface OnboardingContextValue {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  data: DEFAULTS,
  update: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(DEFAULTS);
  function update(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }
  return (
    <OnboardingContext.Provider value={{ data, update }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingData(): OnboardingContextValue {
  return useContext(OnboardingContext);
}
