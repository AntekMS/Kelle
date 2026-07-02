import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { Allergen, DietOption, Goal, UserProfile } from '../../types';
import { EU14_ALLERGENS, EQUIPMENT_META } from '../../types';
import { loadProfile, saveProfile } from '../../store/profile-store';
import { DIET_LABELS, GOAL_LABELS } from '../../lib/labels';
import AllergenChip from '../../components/AllergenChip';
import ICON_IMAGES from '../../components/icon-images';
import { colors } from '../../theme/colors';

const DIET_OPTIONS = Object.keys(DIET_LABELS) as DietOption[];
const GOAL_OPTIONS = Object.keys(GOAL_LABELS) as Goal[];

// Gleiche Werte wie im Onboarding (ZeitScreen) — der harte Zeitfilter rechnet
// mit time_budget_min × 1.2.
const TIME_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: '< 15 Min' },
  { value: 30, label: '~ 30 Min' },
  { value: 60, label: 'Mehr Zeit' },
];

/**
 * Bearbeitet die Profil-Präferenzen (Diät, Allergien, Ziele, Zeit, Geräte) —
 * Art.-9-Daten bleiben in SecureStore auf dem Gerät (#38). Consent und
 * Verlauf werden hier bewusst nicht angefasst.
 */
export default function ProfilEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [diet, setDiet] = useState<DietOption>('omnivore');
  const [allergies, setAllergies] = useState<Set<Allergen>>(new Set());
  const [goals, setGoals] = useState<Set<Goal>>(new Set(['none']));
  const [timeBudget, setTimeBudget] = useState(30);
  const [equipment, setEquipment] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadProfile();
      if (!active) return;
      if (loaded) {
        setProfile(loaded);
        setDiet(loaded.diet);
        setAllergies(new Set(loaded.allergies));
        setGoals(new Set(loaded.goals.length > 0 ? loaded.goals : ['none']));
        setTimeBudget(loaded.time_budget_min);
        setEquipment(new Set(loaded.equipment));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function toggleAllergen(allergen: Allergen) {
    setAllergies((prev) => {
      const next = new Set(prev);
      if (next.has(allergen)) next.delete(allergen);
      else next.add(allergen);
      return next;
    });
  }

  // 'none' ist exklusiv — gleiche Logik wie im Onboarding (ZielScreen).
  function toggleGoal(goal: Goal) {
    setGoals((prev) => {
      const next = new Set(prev);
      if (goal === 'none') return new Set<Goal>(['none']);
      next.delete('none');
      if (next.has(goal)) {
        next.delete(goal);
        if (next.size === 0) next.add('none');
      } else {
        next.add(goal);
      }
      return next;
    });
  }

  function toggleEquipment(value: string) {
    setEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function handleSave() {
    if (!profile || saving) return;
    setSaving(true);
    try {
      const updated: UserProfile = {
        ...profile,
        diet,
        allergies: Array.from(allergies),
        goals: Array.from(goals),
        time_budget_min: timeBudget,
        equipment: Array.from(equipment),
        updated_at: new Date().toISOString(),
      };
      await saveProfile(updated);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Kein Profil gefunden</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
    >
      <Text style={styles.privacyNote}>Diese Daten bleiben auf deinem Gerät.</Text>

      <Section title="Ernährungsweise">
        {DIET_OPTIONS.map((opt) => (
          <RadioRow
            key={opt}
            label={DIET_LABELS[opt]}
            selected={diet === opt}
            onPress={() => setDiet(opt)}
          />
        ))}
      </Section>

      <Section title="Allergien">
        <View style={styles.chips}>
          {EU14_ALLERGENS.map((allergen) => (
            <AllergenChip
              key={allergen}
              allergen={allergen}
              selected={allergies.has(allergen)}
              onToggle={() => toggleAllergen(allergen)}
            />
          ))}
        </View>
        <Text style={styles.hint}>Gerichte mit diesen Zutaten werden immer gefiltert.</Text>
      </Section>

      <Section title="Ziele">
        <View style={styles.chips}>
          {GOAL_OPTIONS.map((goal) => (
            <SelectChip
              key={goal}
              label={GOAL_LABELS[goal]}
              selected={goals.has(goal)}
              onPress={() => toggleGoal(goal)}
            />
          ))}
        </View>
      </Section>

      <Section title="Zeitbudget">
        {TIME_OPTIONS.map((opt) => (
          <RadioRow
            key={opt.value}
            label={opt.label}
            selected={timeBudget === opt.value}
            onPress={() => setTimeBudget(opt.value)}
          />
        ))}
      </Section>

      <Section title="Meine Küche">
        <View style={styles.grid}>
          {EQUIPMENT_META.map((item) => {
            const isSelected = equipment.has(item.value);
            return (
              <Pressable
                key={item.value}
                style={[styles.equipChip, isSelected && styles.equipChipSelected]}
                onPress={() => toggleEquipment(item.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={item.label}
              >
                <Image
                  source={ICON_IMAGES[item.iconKey]}
                  style={[styles.equipIcon, isSelected && styles.equipIconSelected]}
                  resizeMode="contain"
                />
                <Text style={[styles.equipLabel, isSelected && styles.equipLabelSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Pressable
        style={({ pressed }) => [styles.cta, (pressed || saving) && styles.ctaPressed]}
        onPress={handleSave}
        disabled={saving}
        accessibilityLabel="Profil speichern"
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>{saving ? 'Speichert…' : 'Speichern'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RadioRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={styles.radioRow}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

function SelectChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.selectChip, selected && styles.selectChipSelected]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.selectChipText, selected && styles.selectChipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  privacyNote: { fontSize: 13, color: colors.textMuted },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 15, fontWeight: '600', color: colors.text,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  radioLabel: { fontSize: 16, color: colors.text },
  selectChip: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.surface,
  },
  selectChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectChipText: { fontSize: 14, fontWeight: '500', color: colors.text },
  selectChipTextSelected: { color: colors.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  equipChip: {
    width: '47%', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    padding: 16, backgroundColor: colors.surface, alignItems: 'center', gap: 8,
  },
  equipChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  equipIcon: { width: 40, height: 40 },
  equipIconSelected: { tintColor: colors.surface },
  equipLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  equipLabelSelected: { color: colors.surface },
  cta: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
});
