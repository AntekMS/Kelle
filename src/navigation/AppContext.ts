import { createContext, useContext } from 'react';

interface AppContextValue {
  onConsentGranted: () => void;
}

export const AppContext = createContext<AppContextValue>({
  onConsentGranted: () => {},
});

export function useAppContext(): AppContextValue {
  return useContext(AppContext);
}
