export type OnboardingStackParamList = {
  Welcome: undefined;
  Ziel: undefined;
  Kueche: undefined;
  Zeit: undefined;
  Koennen: undefined;
  ErnährungAllergien: undefined;
  ConsentScreen: undefined;
  Datenschutz: undefined;
  Impressum: undefined;
};

export type FeedStackParamList = {
  Feed: undefined;
  DishDetail: { dishId: string };
  Profil: undefined;
  ProfilBearbeiten: undefined;
  Settings: undefined;
  Datenschutz: undefined;
  Impressum: undefined;
};

// Profil (+ Bearbeiten + Settings-Trio) auch in Fav-/ShoppingStack registriert,
// damit der Profil-Header-Button überall in den Stack pusht (Back-Swipe bleibt — #38/#30).
export type FavoritesStackParamList = {
  Favorites: undefined;
  DishDetail: { dishId: string };
  Profil: undefined;
  ProfilBearbeiten: undefined;
  Settings: undefined;
  Datenschutz: undefined;
  Impressum: undefined;
};

export type ShoppingStackParamList = {
  ShoppingList: undefined;
  DishDetail: { dishId: string };
  Profil: undefined;
  ProfilBearbeiten: undefined;
  Settings: undefined;
  Datenschutz: undefined;
  Impressum: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  Datenschutz: undefined;
  Impressum: undefined;
};

export type MainTabParamList = {
  FeedTab: undefined;
  FavoritesTab: undefined;
  ShoppingTab: undefined;
  SettingsTab: undefined;
};
