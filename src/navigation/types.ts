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
};

export type FavoritesStackParamList = {
  Favorites: undefined;
  DishDetail: { dishId: string };
};

export type ShoppingStackParamList = {
  ShoppingList: undefined;
  DishDetail: { dishId: string };
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
