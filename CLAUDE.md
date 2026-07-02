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
- **Cybersecurity IMMER mitdenken** — bei jeder Änderung Sicherheitsauswirkungen prüfen:
  - Externe Daten (Supabase/Cloud) NIE ungeprüft übernehmen — strukturell validieren, fail-safe: im Zweifel Gericht verwerfen (siehe `cloud-catalog.ts`: `isValidCloudDish`/`isValidCloudIngredient`/`hardenCloudDishes`).
  - SQL nur parameterisiert (`?`-Bindings) — nie String-Interpolation ins Statement.
  - Keine Secrets in Code, Git oder App-`.env`; neue Abhängigkeiten und jeden neuen Netzwerkzugriff kritisch hinterfragen.
  - Art.-9-Daten bleiben lokal (siehe oben); fail-open-Pfade im Allergenfilter sind Sicherheitsbugs.

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
                    #   addDishToList summiert doppelte ingredient_ids pro Gericht (kein REPLACE-Verlust)
                    #   markDishCooked ist idempotent (NOT-EXISTS-Guard gegen Doppel-Tap)
                    #   _resetDbForTests (nur für Tests — setzt SQLite-Singleton zurück)
    __tests__/
      database.test.ts  # 27 Tests: normalizeToBase, getAllDishes, Transaktionen, clearAllUserData etc.
      cloud-catalog.test.ts # 12 Tests: Cloud-Validierung + hardenCloudDishes (Allergen-Union)
    cloud-catalog.ts # Supabase fetch: fetchDishesFromCloud(), fetchIngredientsFromCloud()
                     #   wirft wenn supabase==null → FeedScreen fällt auf Bundled-Daten zurück
                     #   SECURITY: validiert jede Row strukturell (isValidCloudDish/-Ingredient),
                     #   malformte Rows werden verworfen (fail-safe). hardenCloudDishes vereinigt
                     #   dish.allergens mit den Zutaten-Allergenen und verwirft Gerichte mit
                     #   unbekannten Zutaten — Cloud-Daten können den Allergenfilter nicht unterlaufen
  lib/
    supabase.ts     # Supabase-Client (EXPO_PUBLIC_ env vars) — NULL wenn env fehlt (Offline-Fallback statt Crash)
    units.ts        # normalizeToBase(amount, unit, ing) — EINZIGE Quelle der Einheiten-Konversion
                    #   genutzt von database.ts (Einkaufsliste) UND scoring.ts (Nährwerte)
                    # formatShoppingAmount(amountBase, ing) — Anzeige-Formatierung der Einkaufsliste:
                    #   zählbare Zutaten (stueck-Konversion) → "n Stück", sonst g/ml bzw. kg/l ab 1000
                    # scaleServingAmount(amount, servings, servingBase) — Portionsrechner (#46),
                    #   reine Anzeige-Skalierung in DishDetail (max 1 Nachkommastelle)
    __tests__/
      units.test.ts # 13 Tests: normalizeToBase + formatShoppingAmount + scaleServingAmount
    policy.ts       # CURRENT_POLICY_VERSION Konstante — importiert in ConsentScreen, SettingsScreen, DatenschutzScreen, App.tsx
    labels.ts       # Zentrale DE-Anzeige-Labels: DIET_LABELS, GOAL_LABELS, ALLERGEN_LABELS,
                    #   EQUIPMENT_LABELS (aus EQUIPMENT_META abgeleitet — kein Drift)/equipmentLabel,
                    #   formatTimeBudget — genutzt von AllergenChip + ProfilScreen
    __tests__/
      labels.test.ts # 8 Tests: Label-Vollständigkeit, EQUIPMENT_LABELS↔EQUIPMENT_META, equipmentLabel, formatTimeBudget
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
                      # LAYOUT (#32): FeaturedDishCard (forYou[0], 'FÜR DICH HEUTE') im ListHeader
                      #   + 2-Spalten-Grid aus DishGridCard. SectionList behält 'Für dich'/'Schon gekocht',
                      #   aber section.data = Dish[][] (chunkPairs à 2); renderItem = row mit 2 Grid-Karten
                      #   (leerer gridSpacer bei ungerader Anzahl). Bei aktiver Suche: kein Featured.
                      # Karten: Herz (Favorit) + Plus/Haken für Einkaufsliste (#41) — Gekocht liegt auf DishDetail
                      # STABILE REIHENFOLGE (#44): Favorit-/Listen-Toggles + refreshOnFocus ranken
                      #   NICHT neu (stabilizeRanking) — neu sortiert nur bei loadFeed()/Pull-to-Refresh.
                      #   Der harte Filter greift trotzdem bei JEDEM Fokus (Stabilität = nur Sortierung!)
                      # Suchfeld (TextInput über Liste) → client-seitiger Name-Filter auf rankedDishes
                      # Header-Banner bei nicht-leerer Liste → cross-tab zu ShoppingTab (getParent)
                      # Offline: NetInfo.fetch() (echter Netzstatus) ODER Cloud-Fetch fehlschlägt/leer → usingOfflineData
                      # Cloud-Daten nur als Ganzes (Dishes UND Ingredients non-empty, nach Härtung):
                      #   Teilantworten → Offline-Fallback. Bundled-Seed NUR bei leerem Cache
                      #   (First-Run) — nie einen gefüllten Cloud-Cache mit dem Bundle überschreiben
                      # Pull-to-Refresh via RefreshControl (silent=true → kein Loading-Spinner)
                      # useFocusEffect → refreshOnFocus(): Profil + Liste neu laden, harten Filter
                      #   (filterCompatibleDishes auf allDishes im State) NEU anwenden; Reihenfolge
                      #   bleibt stabil via stabilizeRanking (übernimmt DishDetail-/Profil-Änderungen)
                      # WICHTIG: seedDishes + seedIngredients sequenziell awaiten (nicht Promise.all)
      feed-sections.ts # partitionByCooked(dishes, cookedIds) → { forYou, cooked } (UI-Aufteilung, Reihenfolge erhalten)
                       # stabilizeRanking(prevOrder, nextRanked) — stabile Feed-Reihenfolge (#44):
                       #   bestehende Positionen bleiben, neu Kompatibles hinten dran, Gefiltertes fällt raus
      scoring.ts      # score = ziel_fit × machbarkeit × repetition_penalty + favBonus + overlapBonus
                      # machbarkeit zählt NEUE Techniken aus techniques_required ∪ {technique_taught}
                      #   minus profile.skill_techniques (countNewTechniques, exportiert)
                      # computeNutritionPerServing(dish, ingredientMap) exportiert — kcal/Protein/Carbs
                      #   pro Portion; genutzt von ziel_fit, DishCard und DishDetailScreen
      __tests__/
        scoring.test.ts  # 32 Tests: scoreDish + rankDishes + computeNutritionPerServing
        feed-sections.test.ts # 9 Tests: partitionByCooked + stabilizeRanking (#44)
    filter/
      allergen-filter.ts               # 4 harte Filter + filterCompatibleDishes
      __tests__/allergen-filter.test.ts # 22 Tests — alle grün
    favorites/
      FavoritesScreen.tsx  # 2-Spalten-Grid (DishGridCard, chunkPairs) von profile.favorites
                           # Kein Scoring/Ranking; Herz entfernt Gericht direkt; catchy Empty-State (Icon)
                           # useFocusEffect → vollständiger Reload beim Tab-Wechsel (SQLite-only)
                           # Plus/Haken auf den Karten toggelt Einkaufsliste (#41, eigener listDishIds-State)
    shopping/
      ShoppingListScreen.tsx  # Eigener Tab (ShoppingStack); Gerichte-Card mit Thumbnail + antippbar → DishDetail
                              # Zutaten gruppiert nach aisle_category; Mengen via formatShoppingAmount
                              # useFocusEffect → Reload beim Tab-Fokus; "Leeren" lädt neu (kein goBack)
    dish/
      DishDetailScreen.tsx    # Rezept-Screen (Param dishId): Hero, Herz-Favorit (neben Name), Nährwerte,
                              # Zutaten mit Portions-Stepper (#46: 1–8, scaleServingAmount skaliert NUR
                              #   die Anzeige; Nährwerte bleiben pro Portion, Liste bei serving_base),
                              # nummerierte Schritte,
                              # "+ Zur Einkaufsliste"-Toggle + "Als gekocht markieren" (#33, lädt Profil)
                              # Profil-Mutationen über updateProfile (profileRef + serialisierte
                              #   saveProfile-Queue) — Herz + „gekocht" können sich nicht überschreiben
                              # in FeedStack, FavStack und ShoppingStack registriert
    profil/
      ProfilScreen.tsx        # Read-only Profil (Route 'Profil', via Header-Button in Feed/Fav/Shopping — #38):
                              # Ernährung/Allergien, Ziele/Zeitbudget, Küche, Verlauf gekochter Gerichte
                              #   (antippbar → DishDetail), Row → ProfilBearbeiten, Link → Settings
                              #   (navigate im selben Stack, Back-Stack bleibt — #30). Labels aus lib/labels.
      ProfilEditScreen.tsx    # Profil bearbeiten (#38): Diät (Radio), Allergien (AllergenChip/EU14),
                              # Ziele ('none' exklusiv wie ZielScreen), Zeitbudget (15/30/60 wie Onboarding),
                              # Geräte (EQUIPMENT_META) → saveProfile; Consent/Verlauf unangetastet.
                              # Feed übernimmt Änderungen via refreshOnFocus (harter Filter bei Fokus)
    settings/
      SettingsScreen.tsx      # DSGVO-Betroffenenrechte (Export via Share, Löschen) + Links zu Datenschutz/Impressum
                              # Export umfasst Profil + SQLite-Einkaufsliste (Parität zur Löschung, Art. 15/20)
                              # Löschen → deleteProfile() + clearAllUserData() (SecureStore + SQLite)
    legal/
      DatenschutzScreen.tsx   # Statische Datenschutzerklärung (Art. 13 DSGVO) — Kontaktdaten noch Platzhalter
                              # Cloud-Abschnitt: Serverstandort Mumbai/Indien korrekt benannt (nicht mehr "EU-Hosting")
      ImpressumScreen.tsx     # §5 DDG Impressum — Kontaktdaten noch Platzhalter
  components/
    DishGridCard.tsx   # Kompakte Grid-Karte (Feed + Favoriten): Bild (aspectRatio 4:3),
                      #   Herz-Overlay + Gekocht-Badge auf dem Bild, Name (1 Zeile) + Meta (Zeit·kcal)
                      #   Ganze Karte onPress → DishDetail; flex:1 (Grid-Zelle); PressableScale
                      #   Optionaler Plus/Haken-Button (#41: isInList/onToggleList) toggelt Einkaufsliste
                      #   direkt on-card — Gekocht liegt weiter auf DishDetail
    FeaturedDishCard.tsx # Große Hero-Karte oben im Feed ('FÜR DICH HEUTE'): volles Bild, Text-Overlay
                      #   (Eyebrow/Name 1-zeilig/Meta Zeit·kcal·Protein), Herz-Overlay; onPress → DishDetail
                      #   Overlay ≤ ~1/3 Bildhöhe (#40) mit Pseudo-Verlauf (rgba-Streifen, keine neue Dependency)
                      # (DishCard.tsx entfernt — durch die beiden Karten oben ersetzt)
                      # Alle Icons via ICON_IMAGES (keine Emoji-Zeichen)
    PressableScale.tsx # Pressable-Ersatz mit dezentem Scale-Feedback (Animated, useNativeDriver)
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
                            #   FeedTab/FavoritesTab/ShoppingTab: je eigener Stack mit Root → DishDetail,
                            #     Profil, ProfilBearbeiten, Settings/Datenschutz/Impressum (#38/#30 —
                            #     ProfileHeaderButton als headerRight auf allen 3 Root-Screens,
                            #     Navigation pusht im selben Stack, Back-Swipe bleibt)
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
| Test-Suite | ✅ 137 Tests grün (scoring, profile-store, database, cloud-catalog, allergen-filter, units, equipment, labels, feed-sections) |
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
| Feed-Verlauf-Sektion (Issue #23) | ✅ done — SectionList 'Für dich'/'Schon gekocht' (partitionByCooked) |
| Tap-Animationen (Issue #12) | ✅ done — PressableScale auf DishCard-Aktionen + Herz |
| Back-Swipe-Navigation (Issue #30) | ✅ done — Settings-Trio im FeedStack registriert; Profil→Einstellungen pusht statt Cross-Tab-Sprung |
| Feed-Redesign: Featured + 2-Spalten-Grid (Issue #32) | ✅ done — FeaturedDishCard + DishGridCard; SectionList mit chunkPairs; DishCard.tsx entfernt |
| DishDetail: "Als gekocht markieren" + Herz (Issue #33) | ✅ done — lädt Profil, markDishCooked/saveProfile; Favorit-Toggle |
| Catchy Empty-States (Issue #34) | ✅ done — Icon + Text auf Feed/Favoriten/Einkauf |
| Offline-Erkennung via NetInfo (Issue #18) | ✅ done — NetInfo.fetch() im Feed; Geräte-Verifikation über Mobilfunk noch offen |
| Security-/Bug-Review-Fixes (02.07.2026) | ✅ done — Cloud-Daten-Validierung + Allergen-Härtung (fail-safe), Cloud/Bundled-Seeding konsistent, harter Filter bei Fokus neu, DishDetail-Profil-Races (Ref + Save-Queue), markDishCooked idempotent, Duplikat-Zutaten summiert, DSGVO-Export inkl. Einkaufsliste, GitHub-PAT aus .env entfernt |
| Stabile Feed-Reihenfolge (Issue #44) | ✅ done — stabilizeRanking; Re-Ranking nur bei Refresh; harter Filter weiter bei jedem Fokus |
| Feed-Polish (Issues #40/#41/#42) | ✅ done — Featured-Overlay ≤ 1/3, Suchfeld zentriert, Plus-Button auf Grid-Karten (Feed + Favoriten) |
| Profil editierbar + überall erreichbar (Issue #38) | ✅ done — ProfilEditScreen (Diät/Allergien/Ziele/Zeit/Geräte); ProfileHeaderButton in Feed/Fav/Shopping |
| Portionsrechner in DishDetail (Issue #46) | ✅ done — Stepper 1–8, scaleServingAmount (Anzeige-Schicht); Liste bleibt bei serving_base |
| App-Store-Identität + EAS (Issue #16) | 🟡 teilw. — bundleId/package/Splash in app.json + eas.json angelegt; Developer-Accounts + Store-Metadaten offen |
| Rechtliche Angaben (Issue #15) | 🟡 teilw. — "EU-Hosting"-Falschaussage korrigiert; Kontaktdaten-Platzhalter offen (Nutzer-Daten nötig) |

## Design-System

```
src/theme/colors.ts        # Zentrale Farbpalette (Terrakotta #C2613D, Salbei #889E7B, Hafer #F4ECDD …)
src/components/dish-images.ts  # Statische Require-Map: image_asset-Name → JPG in assets/
src/components/icon-images.ts  # Statische Require-Map: Icon-Name → PNG in assets/icons/
assets/icons/              # 15 PNG-Dateien (noch vom Nutzer anzulegen — siehe unten)
```

Fonts: `Spectral_400Regular`, `Spectral_600SemiBold`, `Spectral_700Bold` via `@expo-google-fonts/spectral`.
Font-Loading in `App.tsx` mit `useFonts` + `SplashScreen.preventAutoHideAsync()`.
Spectral aktiv auf: DishGridCard-Name (`600SemiBold`), FeaturedDishCard-Name (`700Bold`), WelcomeScreen-Titel (`700Bold`).

Icons nutzen `tintColor` — monochromatische PNGs liefern, Farbe wird per Style gesetzt.

## Noch offen

- **GitHub-PAT rotieren (Nutzer-Aktion)**: Ein GitHub Personal Access Token lag bis 02.07.2026 im Klartext in `.env` (nicht in Git-Historie, aber auf Platte). Zeile ist entfernt — das Token muss auf github.com widerrufen/rotiert werden (Settings → Developer settings → Personal access tokens) und darf nur noch außerhalb des Repos liegen (z. B. `gh auth login`).
- **`el`/`tl`-Fallback in `normalizeToBase`** (`lib/units.ts`): Fehlt die Konversion in `unit_conversions`, wird Faktor 1 angenommen → „2 EL Öl" = 2 g. Datenqualitäts-Falle: bei neuen Zutaten immer `el`/`tl`/`stueck`-Konversionen pflegen.
- **icon_settings.png**: Fehlt noch in `assets/icons/` — aktuell Platzhalter `icon_technique.png`. Monochromes Gear-Icon (512×512 PNG) ablegen und `icon-images.ts` `settings`-Key anpassen.
- **icon_cart.png**: Fehlt noch in `assets/icons/` — Einkauf-Tab nutzt Platzhalter `icon_check.png`. Monochromes Warenkorb-Icon (512×512 PNG) ablegen und `icon-images.ts` `shopping`-Key anpassen.
- **Geräte-Icons** (Issue #9): `icon_puerierstab.png`, `icon_toaster.png`, `icon_sandwichmaker.png`, `icon_reiskocher.png` fehlen — aktuell alle Platzhalter `icon_technique.png`. Monochrome 512×512 PNGs ablegen und die jeweiligen `iconKey`-Mappings in `icon-images.ts` anpassen.
- **icon_person.png**: Fehlt noch in `assets/icons/` — Profil-Header-Button nutzt Platzhalter `icon_technique.png`. Monochromes Person-/Avatar-Icon (512×512 PNG) ablegen und `icon-images.ts` `profil`-Key anpassen.
- **Supabase-Hosting-Region**: Projekt liegt in `ap-south-1` (Mumbai), NICHT EU. ✅ DatenschutzScreen-Aussage korrigiert (Serverstandort Mumbai/Indien; nur Katalogdaten, keine Art.-9-Daten in der Cloud).
- **Impressum/Datenschutz**: Platzhalter `[Vorname Nachname]`, `[Straße Hausnummer, PLZ Ort]`, `[deine@email.de]` in `DatenschutzScreen.tsx` + `ImpressumScreen.tsx` ersetzen (§5 DDG + DSGVO Art. 13 Pflicht vor Release) — braucht echte Daten vom Nutzer (Issue #15).
- **App-Store (Issue #16, Rest)**: `app.json` (bundleId/package/Splash) + `eas.json` liegen vor. Offen: Apple-/Google-Developer-Accounts mit EAS verbinden, Store-Metadaten (Name/Beschreibung/Keywords/Screenshots). `bundleIdentifier`/`package` = `de.kelleapp.kuechencoach` (ggf. anpassen).
- **Offline-Geräte-Test (Issue #18, Rest)**: NetInfo-Erkennung im Code; physisches iPhone über Mobilfunk gegen Supabase noch zu verifizieren (RLS: INSERT mit anon-Key → 403 erwartet).
- **Kalorienbedarf-Profiling** (Issue #29, v1.1 — M18): Alter/Geschlecht/Gewicht/Größe → Tagesbedarf → Portionsmengen. **Art.-9-Gesundheitsdaten → lokal-only**, niemals Cloud/USDA; erfordert Policy-Version-Bump (`src/lib/policy.ts`). Vor Code DSGVO-/Design-Konzept abnehmen lassen.
- **Ratings**: Phase 2 — benötigt Cloud-Aggregation
- **Cloud-Accounts + Login** (Issues #4, #5): v2.0 — nur nicht-sensible Daten (`favorites`, `cooked_dish_ids`) dürfen in die Cloud; `allergies`/`diet`/`consent` bleiben lokal (DSGVO Art. 9)

## Befehle

```bash
npx expo start          # Dev-Server
npx expo start --ios    # iOS-Simulator
npx jest                # Tests (137 grün)
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
