# Küchen-Coach — CLAUDE.md

## Projekt-Übersicht
Mobile Lern-App für Kocheinsteiger. Local-First-Architektur: Alle Daten (Gerichte, Nährwerte, Nutzerprofil) liegen auf dem Gerät. Kein Backend, kein Server, keine KI zur Laufzeit.

**Tech-Stack:** Expo (React Native), TypeScript, expo-sqlite, expo-secure-store

## Verbote (nicht verhandelbar)

- Allergie-, Ernährungs- und Religionsdaten (DSGVO Art. 9) verlassen NIE das Gerät.
- Niemals Nutzerprofil-Daten an irgendeine externe API senden (auch nicht USDA).
- Der Allergenfilter ist IMMER regelbasiert — NIE KI-geraten oder probabilistisch.
- Nährwerte kommen IMMER aus der lokalen Daten-Datei — NIE vom Modell erfunden oder geschätzt.
- Vor größeren Änderungen: neuen Git-Branch anlegen.
- Niemals API-Keys oder Secrets in den Code oder ins Git committen. Secrets gehören in `.env` (per `.gitignore` ausgeschlossen).

## Architektur

```
src/
  data/         # Statische JSON-Daten: Gerichte, Zutaten, Nährwerte, Allergene
  db/           # SQLite-Schicht (expo-sqlite), nur lokale Reads/Writes
  store/        # Nutzerprofil (expo-secure-store): Allergien, Präferenzen, Einwilligung
  features/
    onboarding/ # Einwilligungs-Flow (Art. 9 Abs. 2 lit. a)
    feed/       # Gerichts-Feed mit Gewichtungs-Logik (lokal, deterministisch)
    filter/     # Allergenfilter (regelbasiert, EU-14-Vokabular)
    shopping/   # Einkaufsliste
  components/
  navigation/
```

## Datenmodell (Kern)

- `Dish`: id, name, techniques[], ingredients[], allergens[] (aggregiert), difficulty, time
- `Ingredient`: id, name, allergens[], nutrients_per_100g, unit, weight_g
- `UserProfile`: id, consent (timestamp, policyVersion), allergies[], diet[], religiousRestrictions[]
- Allergene: immer als **Vereinigung aller Zutaten-Allergene** berechnet — nie manuell am Gericht gesetzt

## Allergenfilter — Regeln

1. EU-14-Allergene-Vokabular ist fix (keine freien Strings vom Modell erfinden)
2. Ein Gericht wird gefiltert, wenn: `dish.allergens ∩ profile.allergies ≠ ∅`
3. Kein "wahrscheinlich frei von X" — nur deterministisch regelbasiert
4. Test: Profil meidet Erdnüsse → kein Gericht mit Erdnuss-Zutat darf je im Feed erscheinen

## Einwilligung (Art. 9)

- Aktive Einwilligung: kein Vorabhäkchen, spezifisch, widerrufbar
- `UserProfile.consent`: `{ timestamp: ISO8601, policyVersion: string, granted: boolean }`
- Betroffenenrechte: Bearbeiten / Export / Löschen in den Einstellungen

## Befehle

```bash
npx expo start          # Dev-Server starten
npx expo start --ios    # iOS-Simulator
npx jest                # Tests
npx tsc --noEmit        # Typcheck
```

## Konventionen

- TypeScript strict mode
- Keine `any`-Types
- Komponenten: PascalCase, Dateien: kebab-case
- Jede Funktion im Allergenfilter hat Unit-Tests
- Commit-Stil: `feat:`, `fix:`, `chore:` — kurz, auf Englisch
