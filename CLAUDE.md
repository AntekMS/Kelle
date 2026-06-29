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
- **SQLite**: Niemals zwei Funktionen mit `withTransactionAsync` parallel per `Promise.all` aufrufen — SQLite erlaubt nur eine Transaktion gleichzeitig pro Connection. Stattdessen sequenziell awaiten.
- Einheiten-Konversion (`amount` → `base_unit`) läuft IMMER über `normalizeToBase` aus `src/lib/units.ts` — NIE inline duplizieren (Scoring und Einkaufsliste müssen identisch normalisieren).

## Architektur

```
src/
  data/             # Bundled fallback: dishes.ts (15 Gerichte), ingredients.ts (33 Zutaten)
  db/
    database.ts     # SQLite-Cache + Shopping-Liste (schema v2)
                    #   initDatabase, seedDishes, seedIngredients
                    #   getAllDishes, getAllIngredients, markDishCooked
                    #   getOrCreateActiveList, getActiveDishIds
                    #   addDishToList, removeDishFromList
                    #   getActiveShoppingList, toggleShoppingItem, clearActiveShoppingList
                    #   clearAllUserData (DSGVO-Löschung: alle Shopping-Tabellen + cooked_history)
                    #   normalizeToBase (re-exportiert aus lib/units — auch von Tests genutzt)
                    #   addDishToList/removeDishFromList/clearActiveShoppingList/clearAllUserData
                    #     kapseln ihre Schreibvorgänge in withTransactionAsync (atomar)
                    #   _resetDbForTests (nur für Tests — setzt SQLite-Singleton zurück)
    __tests__/
      database.test.ts  # 25 Tests: normalizeToBase, getAllDishes, Transaktionen, clearAllUserData etc.
    cloud-catalog.ts # Supabase fetch: fetchDishesFromCloud(), fetchIngredientsFromCloud()
                     #   wirft wenn supabase==null → FeedScreen fällt auf Bundled-Daten zurück
  lib/
    supabase.ts     # Supabase-Client (EXPO_PUBLIC_ env vars) — NULL wenn env fehlt (Offline-Fallback statt Crash)
    units.ts        # normalizeToBase(amount, unit, ing) — EINZIGE Quelle der Einheiten-Konversion
                    #   genutzt von database.ts (Einkaufsliste) UND scoring.ts (Nährwerte)
                    # formatShoppingAmount(amountBase, ing) — Anzeige-Formatierung der Einkaufsliste:
                    #   zählbare Zutaten (stueck-Konversion) → "n Stück", sonst g/ml bzw. kg/l ab 1000
    __tests__/
      units.test.ts # 9 Tests: normalizeToBase + formatShoppingAmount (Stück/kg/l/Fallback)
    policy.ts       # CURRENT_POLICY_VERSION Konstante — importiert in ConsentScreen, SettingsScreen, DatenschutzScreen, App.tsx
    labels.ts       # Zentrale DE-Anzeige-Labels: DIET_LABELS, GOAL_LABELS, ALLERGEN_LABELS,
                    #   EQUIPMENT_LABELS/equipmentLabel, formatTimeBudget — genutzt von AllergenChip + ProfilScreen
    __tests__/
      labels.test.ts # 7 Tests: Label-Vollständigkeit (Diät/Ziele/Allergene), equipmentLabel, formatTimeBudget
  store/
    profile-store.ts # SecureStore CRUD: loadProfile, saveProfile, deleteProfile, hasGrantedConsent
    __tests__/
      profile-store.test.ts  # 12 Tests: CRUD + hasGrantedConsent (expo-secure-store gemockt)
  types/
    index.ts        # Alle Typen (Dish, Ingredient, UserProfile, ShoppingList, ShoppingItem …)
                    # EQUIPMENT_OPTIONS (Equipment-Union) + EQUIPMENT_META (value/label/iconKey,
                    #   `satisfies` → einzige Quelle für den Geräte-Picker, kein Drift)
  features/
    onboarding/     # 7-Screen-Flow (WelcomeScreen → ZielScreen → KuecheScreen → ZeitScreen → KoennenScreen → AllergenSetupScreen → ConsentScreen)
                    # KuecheScreen rendert EQUIPMENT_META (10 Geräte inkl. Toaster/Pürierstab/Sandwichmaker/Reiskocher)
    feed/
      FeedScreen.tsx  # Pipeline: Cloud → SQLite-Cache → filterCompatibleDishes → rankDishes
                      # State: listDishIds + activeIngredientIds für overlap-Bonus + usingOfflineData
                      # Suchfeld (TextInput über FlatList) → client-seitiger Name-Filter auf rankedDishes
                      # Header-Banner bei nicht-leerer Liste → cross-tab zu ShoppingTab (getParent)
                      # DishCard onPress → navigate DishDetail; ingredientMap an DishCard (Nährwerte)
                      # Offline-Banner wenn Cloud-Fetch fehlschlägt oder leer (usingOfflineData)
                      # Pull-to-Refresh via RefreshControl (silent=true → kein Loading-Spinner)
                      # useFocusEffect → refreshListState() beim Tab-Wechsel (kein Cloud-Refetch)
                      # WICHTIG: seedDishes + seedIngredients sequenziell awaiten (nicht Promise.all)
      scoring.ts      # score = ziel_fit × machbarkeit × repetition_penalty + favBonus + overlapBonus
                      # machbarkeit zählt NEUE Techniken aus techniques_required ∪ {technique_taught}
                      #   minus profile.skill_techniques (countNewTechniques, exportiert)
                      # computeNutritionPerServing(dish, ingredientMap) exportiert — kcal/Protein/Carbs
                      #   pro Portion; genutzt von ziel_fit, DishCard und DishDetailScreen
      __tests__/
        scoring.test.ts  # 32 Tests: scoreDish + rankDishes + computeNutritionPerServing
    filter/
      allergen-filter.ts               # 4 harte Filter + filterCompatibleDishes
      __tests__/allergen-filter.test.ts # 22 Tests — alle grün
    favorites/
      FavoritesScreen.tsx  # Zeigt profile.favorites gefilterte Gerichte; gleiche Aktionen wie Feed
                           # Kein Scoring/Ranking — zeigt alle Favoriten ungefiltert
                           # useFocusEffect → vollständiger Reload beim Tab-Wechsel (SQLite-only)
    shopping/
      ShoppingListScreen.tsx  # Eigener Tab (ShoppingStack); Gerichte-Card mit Thumbnail + antippbar → DishDetail
                              # Zutaten gruppiert nach aisle_category; Mengen via formatShoppingAmount
                              # useFocusEffect → Reload beim Tab-Fokus; "Leeren" lädt neu (kein goBack)
    dish/
      DishDetailScreen.tsx    # Rezept-Screen (Param dishId): Hero, Nährwerte, Zutaten (Originalmengen),
                              # nummerierte Schritte, "+ Zur Einkaufsliste"-Toggle
                              # in FeedStack, FavStack und ShoppingStack registriert
    profil/
      ProfilScreen.tsx        # Read-only Profil (FeedStack-Route 'Profil', via Header-Button im Feed):
                              # Ernährung/Allergien, Ziele/Zeitbudget, Küche, Verlauf gekochter Gerichte
                              #   (antippbar → DishDetail), Link → SettingsTab (getParent). Labels aus lib/labels.
    settings/
      SettingsScreen.tsx      # DSGVO-Betroffenenrechte (Export via Share, Löschen) + Links zu Datenschutz/Impressum
                              # Löschen → deleteProfile() + clearAllUserData() (SecureStore + SQLite)
    legal/
      DatenschutzScreen.tsx   # Statische Datenschutzerklärung (Art. 13 DSGVO) — Kontaktdaten noch Platzhalter
      ImpressumScreen.tsx     # §5 DDG Impressum — Kontaktdaten noch Platzhalter
  components/
    DishCard.tsx      # technique_taught, diet_verified, time_minutes, Herz-Favorit, Shopping-Toggle
                      # Nährwert-Zeile (kcal/Protein/Carbs pro Portion) wenn ingredientMap übergeben
                      # Hero-Image + Name antippbar via onPress (→ DishDetail); height: 180 (fest)
                      # Alle Icons via ICON_IMAGES (keine Emoji-Zeichen)
    dish-images.ts    # Statische Require-Map: image_asset-Name → JPG in assets/
    icon-images.ts    # Statische Require-Map: Icon-Name → PNG in assets/icons/
                      # 'settings' → icon_technique.png (Platzhalter bis icon_settings.png verfügbar)
                      # 'shopping' → icon_check.png (Platzhalter bis icon_cart.png verfügbar)
                      # puerierstab/toaster/sandwichmaker/reiskocher → icon_technique.png (Platzhalter)
                      # 'profil' → icon_technique.png (Platzhalter bis icon_person.png verfügbar)
  navigation/
    AppContext.ts           # AppContextValue: onConsentGranted, onDeleteProfile
    OnboardingContext.tsx   # React Context — Datentransport über alle 7 Screens
    OnboardingNavigator.tsx # Bindet alle 7 Screens + OnboardingProvider ein
    MainNavigator.tsx       # Bottom-Tab-Navigator (4 Tabs) + nested Stacks:
                            #   FeedTab: FeedStack (Feed → DishDetail, Profil); Feed hat headerRight → ProfileHeaderButton
                            #   FavoritesTab: FavStack (Favorites → DishDetail)
                            #   ShoppingTab: ShoppingStack (ShoppingList → DishDetail)
                            #   SettingsTab: SettingsStack (Settings → Datenschutz → Impressum)
                            #   DishDetail in 3 Stacks registriert (Param { dishId })
                            #   Feed-Banner navigiert cross-tab via getParent() → ShoppingTab
    types.ts                # OnboardingStackParamList
                            # FeedStackParamList, FavoritesStackParamList,
                            #   ShoppingStackParamList, SettingsStackParamList
                            # MainTabParamList
```

## Datenmodell

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
interface ShoppingItem {
  id: string; list_id: string; ingredient_id: string; ingredient_name: string;
  amount_base: number; base_unit: 'g' | 'ml'; aisle_category: string;
  is_pantry_staple: boolean; is_checked: boolean;
}
interface ShoppingList {
  id: string; created_at: string;
  dishes: Array<{ dish_id: string; dish_name: string }>;
  items: ShoppingItem[];
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
score = ziel_fit × machbarkeit × repetition_penalty + favBonus + overlapBonus
machbarkeit: neueTechniken=0→0.8, 1→1.0, 2→0.4, 3+→0.1
  neueTechniken = (techniques_required ∪ {technique_taught}) \ skill_techniques  (countNewTechniques)
ziel_fit: [0.7..1.0] basierend auf Nährwerten × Goals
repetition_penalty: gekochte Gerichte ×0.7
favBonus: +0.08 wenn Favorit
overlapBonus: [0..0.12] Anteil Zutaten bereits in aktiver Einkaufsliste
```

## Shopping-Liste (`database.ts` — Schema v2)

- Singleton-Liste mit `ACTIVE_LIST_ID = 'active'`
- 4 Tabellen: `shopping_lists`, `shopping_list_dishes`, `shopping_source_items`, `shopping_items`
- `normalizeToBase(amount, unit, ingredient)` — konvertiert in base_unit (g/ml); lebt in `lib/units.ts`, hier re-exportiert
- Mutationen (`addDishToList`, `removeDishFromList`, `clearActiveShoppingList`, `clearAllUserData`) laufen je in einer `withTransactionAsync`
- `recalculateItems()` — aggregiert Mengen, bewahrt is_checked-Zustand
- `formatShoppingAmount(amountBase, ingredient)` aus `lib/units` — zählbare Zutaten als „n Stück", sonst kg/l ab 1000

## Einwilligung (Art. 9)

- Kein Vorabhäkchen. Consent-Checkbox startet immer `false`.
- `UserConsent.granted_at`: ISO8601-String — Existenz = Einwilligung erteilt
- `hasGrantedConsent()` prüft: `typeof granted_at === 'string' && granted_at.length > 0`
- Betroffenenrechte in SettingsScreen: Export (Share-Sheet mit JSON, Alert-Fallback) + Profil löschen → Onboarding
- Profil löschen entfernt ALLES: SecureStore-Profil (`deleteProfile`) UND alle SQLite-Nutzerdaten (`clearAllUserData`: Einkaufslisten + cooked_history)
- `CURRENT_POLICY_VERSION` in `src/lib/policy.ts` — App.tsx prüft beim Start: Consent vorhanden UND Policy-Version aktuell; sonst → Onboarding

## Implementierungsstand

| Schritt | Status |
|---|---|
| Typen + Datenmodell | ✅ done |
| SQLite-Cache (database.ts) | ✅ done — Schema v2, multi-dish shopping |
| Supabase-Client + cloud-catalog | ✅ done — `.env` mit Credentials liegt lokal |
| Allergenfilter + 4 Filter | ✅ done — 22 Tests grün |
| Scoring (inkl. favBonus + overlapBonus) | ✅ done — 22 Tests grün |
| 7-Screen-Onboarding | ✅ done |
| Feed-Screen (Pipeline) | ✅ done |
| Shopping-Liste (multi-dish, base_unit-Normalisierung) | ✅ done |
| Favoriten-Screen (FavoritesScreen) | ✅ done — eigener Tab, Herz-Toggle entfernt Gericht direkt |
| Bottom-Tab-Navigation (Issue #2) | ✅ done — Entdecken / Favoriten / Einkauf / Einstellungen (4 Tabs) |
| Bilder-Größe repariert (Issue #1) | ✅ done — DishCard heroImage height: 180 |
| Settings + DSGVO-Betroffenenrechte | ✅ done |
| Datenschutzerklärung + Impressum | ✅ done — Kontaktdaten sind noch Platzhalter |
| Gerichte-Content | ✅ 15 Gerichte, 33 Zutaten |
| Supabase-Schema migrieren | ✅ Migration `001_catalog` angewendet |
| Supabase-Seed (Gerichte/Zutaten) | ✅ done — 15 Gerichte + 33 Zutaten in Supabase |
| Brand-Design (Farben, Font, Bilder) | ✅ done — Kelle-Palette, Spectral-Font, 15 Hero-Fotos |
| Icon-System (PNG statt Emoji) | ✅ done — 15 PNGs in assets/icons/; settings → Platzhalter (icon_technique) |
| Test-Suite | ✅ 109 Tests grün (scoring, profile-store, database, allergen-filter, units, equipment, labels) |
| Favoriten-State-Bug fix (Issue #11) | ✅ done — useFocusEffect reload bei Tab-Fokus |
| Einkaufsliste-Sync Feed↔Favoriten (Issue #6) | ✅ done — refreshListState via useFocusEffect im Feed |
| Offline-Banner + Pull-to-Refresh (Issues #18, #21) | ✅ done — usingOfflineData + RefreshControl |
| Accessibility-Baseline (Issue #19) | ✅ done — accessibilityLabel auf allen Pressables in 4 Screens |
| Policy-Version-Konstante (Issue #20) | ✅ done — src/lib/policy.ts; App.tsx prüft Policy-Version bei Start |
| Küchengeräte-Filter (Issue #10) | ✅ done — im Simulator verifiziert (28.06.2026) |
| Code-Review-Fixes (28.06.2026) | ✅ done — DSGVO-Vollständige-Löschung (clearAllUserData), Machbarkeit zählt techniques_required, geteiltes lib/units, Shopping-Mutationen transaktional, Supabase null-safe, Export via Share |
| Eier/zählbare Zutaten als Stück (Issue #14) | ✅ done — formatShoppingAmount (Anzeige-Schicht) |
| Nährwerte auf DishCard (Issue #7) | ✅ done — computeNutritionPerServing exportiert |
| Suchfeld im Feed (Issue #22) | ✅ done — client-seitiger Name-Filter |
| Einkaufslisten-UX (Issue #8) | ✅ done — 4. Tab, DishDetailScreen, Thumbnails, Gewürz-Kategorien konsistent (Bundled + Supabase) |
| Mehr Küchengeräte (Issue #9) | ✅ done — Toaster/Pürierstab/Sandwichmaker/Reiskocher; EQUIPMENT_META als Single Source; Icons Platzhalter |
| Mein Profil (Issue #24) | ✅ done — ProfilScreen via Feed-Header-Button; read-only; zentrale lib/labels; Link zu Settings |

## Design-System

```
src/theme/colors.ts        # Zentrale Farbpalette (Terrakotta #C2613D, Salbei #889E7B, Hafer #F4ECDD …)
src/components/dish-images.ts  # Statische Require-Map: image_asset-Name → JPG in assets/
src/components/icon-images.ts  # Statische Require-Map: Icon-Name → PNG in assets/icons/
assets/icons/              # 15 PNG-Dateien (noch vom Nutzer anzulegen — siehe unten)
```

Fonts: `Spectral_400Regular`, `Spectral_600SemiBold`, `Spectral_700Bold` via `@expo-google-fonts/spectral`.
Font-Loading in `App.tsx` mit `useFonts` + `SplashScreen.preventAutoHideAsync()`.
Spectral aktiv auf: DishCard-Name (`600SemiBold`), WelcomeScreen-Titel (`700Bold`).

Icons nutzen `tintColor` — monochromatische PNGs liefern, Farbe wird per Style gesetzt.

## Noch offen

- **icon_settings.png**: Fehlt noch in `assets/icons/` — aktuell Platzhalter `icon_technique.png`. Monochromes Gear-Icon (512×512 PNG) ablegen und `icon-images.ts` `settings`-Key anpassen.
- **icon_cart.png**: Fehlt noch in `assets/icons/` — Einkauf-Tab nutzt Platzhalter `icon_check.png`. Monochromes Warenkorb-Icon (512×512 PNG) ablegen und `icon-images.ts` `shopping`-Key anpassen.
- **Geräte-Icons** (Issue #9): `icon_puerierstab.png`, `icon_toaster.png`, `icon_sandwichmaker.png`, `icon_reiskocher.png` fehlen — aktuell alle Platzhalter `icon_technique.png`. Monochrome 512×512 PNGs ablegen und die jeweiligen `iconKey`-Mappings in `icon-images.ts` anpassen.
- **icon_person.png**: Fehlt noch in `assets/icons/` — Profil-Header-Button nutzt Platzhalter `icon_technique.png`. Monochromes Person-/Avatar-Icon (512×512 PNG) ablegen und `icon-images.ts` `profil`-Key anpassen.
- **Supabase-Hosting-Region**: Projekt liegt in `ap-south-1` (Mumbai), NICHT EU. DatenschutzScreen behauptet „EU-Hosting" → vor Release korrigieren (nur Katalogdaten, keine Art.-9-Daten in der Cloud, aber Aussage muss stimmen).
- **Impressum/Datenschutz**: Platzhalter `[Vorname Nachname]`, `[Straße Hausnummer, PLZ Ort]`, `[deine@email.de]` in `DatenschutzScreen.tsx` + `ImpressumScreen.tsx` ersetzen (§5 DDG + DSGVO Art. 13 Pflicht vor Release)
- **Ratings**: Phase 2 — benötigt Cloud-Aggregation
- **Cloud-Accounts + Login** (Issues #4, #5): v2.0 — nur nicht-sensible Daten (`favorites`, `cooked_dish_ids`) dürfen in die Cloud; `allergies`/`diet`/`consent` bleiben lokal (DSGVO Art. 9)

## Befehle

```bash
npx expo start          # Dev-Server
npx expo start --ios    # iOS-Simulator
npx jest                # Tests (98 grün)
npx tsc --noEmit        # Typcheck (0 Fehler)
```

## Konventionen

- TypeScript strict — keine `any`-Types
- Komponenten: PascalCase, Dateien: kebab-case
- Jede Kernfunktion hat Unit-Tests (scoring, profile-store, database, allergen-filter)
- Commit-Stil: `feat:`, `fix:`, `chore:` — kurz, auf Englisch
- IDE-Hook-Diagnostics sind oft stale — `npx tsc --noEmit` ist die Wahrheit
- Icons: immer über `ICON_IMAGES` aus `icon-images.ts` — keine Emoji-Zeichen im JSX

## Nach jeder Implementierungs-Aktion

Nach jeder abgeschlossenen Änderung (Feature, Bugfix, Refactor) MUSS Folgendes geprüft und ggf. angepasst werden:

1. **CLAUDE.md** — Architektur-Abschnitt, Implementierungsstand-Tabelle und „Noch offen" aktuell halten
2. **Roadmap** (`~/.claude/plans/kelle-v1-roadmap.md`) — abgeschlossene Milestones als ✅ markieren, neue Erkenntnisse eintragen

Diese Prüfung ist kein optionaler Schritt — sie gehört zum Abschluss jeder Aufgabe.
