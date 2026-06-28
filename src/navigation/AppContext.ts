import { createContext, useContext } from 'react';

interface AppContextValue {
  onConsentGranted: () => void;
  onDeleteProfile: () => void;
}

export const AppContext = createContext<AppContextValue>({
  onConsentGranted: () => {},
  onDeleteProfile: () => {},
});

export function useAppContext(): AppContextValue {
  return useContext(AppContext);
}
