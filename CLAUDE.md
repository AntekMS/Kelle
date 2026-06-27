# Küchen-Coach — CLAUDE.md

## Projekt-Übersicht

Mobile Lern-App für Kocheinsteiger. Rezept-Katalog kommt aus Supabase (read-only, public). Nutzerprofil (Allergien, Diät, Einwilligung) bleibt immer auf dem Gerät — kein Backend-Zugriff auf Art.-9-Daten.

**Tech-Stack:** Expo (React Native), TypeScript strict, expo-sqlite (lokaler Cache), expo-secure-store (Profil), Supabase JS client (Katalog)

## Verbote (nicht verhandelbar)

- Allergie-, Ernährungs- und Religionsdaten (DSGVO Art. 9) verlassen NIE das Gerät.
- Niemals Nutzerprofil-Daten an irgendeine externe API senden (auch nicht USDA).
- Der Allergenfilter ist IMMER regelbasiert — NIE KI-geraten oder probabilistisch.
- Nährwerte kommen IMMER aus der lokalen Daten-Datei — NIE vom Modell erfunden oder geschätzt.
- `diet_verified` an einem Gericht ist IMMER hand-authored — Halal/Koscher ist NICHT aus Zutaten ableitbar.
- Vor größeren Änderungen: neuen Git-Branch anlegen.
- Niemals API-Keys oder Secrets in den Code oder ins Git committen. `.env` ist gitignored.

## Architektur

```
src/
  data/             # Bundled fallback: dishes.ts, ingredients.ts (3 Gerichte, ~15 Zutaten)
  db/
    database.ts     # SQLite-Cache: initDatabase, seedDishes, seedIngredients, getAllDishes, getAllIngredients, markDishCooked
    cloud-catalog.ts # Supabase fetch: fetchDishesFromCloud(), fetchIngredientsFromCloud()
  lib/
    supabase.ts     # Supabase-Client (EXPO_PUBLIC_ env vars)
  store/
    profile-store.ts # SecureStore CRUD: loadProfile, saveProfile, deleteProfile, hasGrantedConsent
  types/
    index.ts        # Alle Typen (Dish, Ingredient, UserProfile, Allergen, DietOption, Goal …)
  features/
    onboarding/     # 7-Screen-Flow (WelcomeScreen → ZielScreen → KuecheScreen → ZeitScreen → KoennenScreen → AllergenSetupScreen → ConsentScreen)
    feed/
      FeedScreen.tsx  # Pipeline: Cloud → SQLite-Cache → filterCompatibleDishes → rankDishes
      scoring.ts      # score = ziel_fit × machbarkeit × repetition_penalty
    filter/
      allergen-filter.ts               # 4 harte Filter + filterCompatibleDishes
      __tests__/allergen-filter.test.ts # 22 Tests — alle grün
    shopping/       # Noch nicht implementiert
  components/
    DishCard.tsx    # technique_taught, diet_verified, time_minutes
  navigation/
    OnboardingContext.tsx   # React Context — Datentransport über alle 7 Screens
    OnboardingNavigator.tsx # Bindet alle 7 Screens + OnboardingProvider ein
    types.ts                # OnboardingStackParamList, AppStackParamList
```

## Datenmodell (aktuell — nach Spec-Alignment, commit 9abe3db)

```ts
type Allergen = 'gluten' | 'crustaceans' | 'eggs' | 'fish' | 'peanuts' | 'soybeans'
              | 'milk' | 'nuts' | 'celery' | 'mustard' | 'sesame' | 'sulphites'
              | 'lupin' | 'molluscs';
type DietOption = 'omnivore' | 'vegetarian' | 'vegan' | 'halal' | 'kosher';
type Goal = 'high_protein' | 'low_carb' | 'lighter' | 'none';
type DishUnit = 'g' | 'ml' | 'stueck' | 'el' | 'tl';

interface NutrientsPer100g { kcal: number; protein_g: number; fat_g: number; carbs_g: number; fiber_g: number; }
interface Ingredient {
  id: string; name: string; allergens: Allergen[]; nutrients_per_100g: NutrientsPer100g;
  base_unit: 'g' | 'ml'; unit_conversions: Record<string, number>;
  aisle_category: string; is_pantry_staple: boolean;
  animal_origin: 'none' | 'dairy' | 'egg' | 'meat' | 'fish';
}
interface DishIngredient { ingredient_id: string; amount: number; unit: DishUnit; }
interface Dish {
  id: string; variant_group?: string; name: string; description: string;
  serving_base: number; techniques_required: string[]; technique_taught: string;
  diet_verified: string[];           // hand-authored — halal NICHT ableitbar
  equipment_required: string[][];    // OR-Gruppen: jede Gruppe muss durch mind. 1 Gerät erfüllt sein
  equipment_optional: string[];
  ingredients: DishIngredient[]; allergens: Allergen[];
  time_minutes: number; steps: string[]; image_asset: string;
}
interface UserConsent { granted_at: string; policy_version: string; } // kein 'granted: boolean'
interface UserProfile {
  id: string; consent: UserConsent; diet: DietOption; allergies: Allergen[];
  goals: Goal[]; equipment: string[]; time_budget_min: number;
  skill_techniques: string[]; cooked_dish_ids: string[]; favorites: string[];
  created_at: string; updated_at: string;
}
```

## Filter-Logik (`allergen-filter.ts`)

Vier harte Ausschlusskriterien — alle müssen bestanden werden:

1. **Allergen**: `dish.allergens ∩ profile.allergies = ∅`
2. **Diät**: `diet === 'omnivore' || dish.diet_verified.includes(diet)`
3. **Equipment**: Jede OR-Gruppe in `equipment_required` muss durch mind. 1 Gerät erfüllt sein
4. **Zeit**: `dish.time_minutes ≤ profile.time_budget_min × 1.2` (20 % Toleranz)

## Scoring-Formel (`scoring.ts`)

```
score = ziel_fit × machbarkeit × repetition_penalty
machbarkeit: neueTekniken=0→0.8, 1→1.0, 2→0.4, 3+→0.1
ziel_fit: [0.7..1.0] basierend auf Nährwerten × Goals
repetition_penalty: gekochte Gerichte ×0.7
```

## Einwilligung (Art. 9)

- Kein Vorabhäkchen. Consent-Checkbox startet immer `false`.
- `UserConsent.granted_at`: ISO8601-String — Existenz = Einwilligung erteilt
- `hasGrantedConsent()` prüft: `typeof granted_at === 'string' && granted_at.length > 0`
- Betroffenenrechte (Bearbeiten / Export / Löschen) in Settings — noch nicht implementiert

## Implementierungsstand

| Schritt | Status |
|---|---|
| Typen + Datenmodell | ✅ done (commit 9abe3db) |
| SQLite-Cache (database.ts) | ✅ done |
| Supabase-Client + cloud-catalog | ✅ done — `.env` mit Credentials liegt lokal |
| Allergenfilter + 4 Filter | ✅ done — 22 Tests grün |
| Scoring (Spec-Formel) | ✅ done |
| 7-Screen-Onboarding | ✅ done |
| Feed-Screen (Pipeline) | ✅ done |
| Shopping-Liste | ❌ noch nicht begonnen |
| Datenschutzerklärung + Impressum | ❌ noch nicht begonnen |
| Gerichte-Content (15–25 total) | ⚠️ 3 Gerichte vorhanden, Rest fehlt |
| Supabase-Schema migrieren | ⚠️ SQL liegt in `supabase/migrations/001_catalog.sql` — Nutzer muss im SQL-Editor ausführen |
| Supabase-Seed (Gerichte/Zutaten) | ❌ noch nicht erledigt |

## Befehle

```bash
npx expo start          # Dev-Server
npx expo start --ios    # iOS-Simulator
npx jest                # Tests (22 grün)
npx tsc --noEmit        # Typcheck (0 Fehler)
```

## Konventionen

- TypeScript strict — keine `any`-Types
- Komponenten: PascalCase, Dateien: kebab-case
- Jede Funktion im Allergenfilter hat Unit-Tests
- Commit-Stil: `feat:`, `fix:`, `chore:` — kurz, auf Englisch
- IDE-Hook-Diagnostics sind oft stale — `npx tsc --noEmit` ist die Wahrheit
