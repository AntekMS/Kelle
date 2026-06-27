import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { Allergen, DietOption } from '../../types';
import { EU14_ALLERGENS } from '../../types';
import AllergenChip from '../../components/AllergenChip';
import { useOnboardingData } from '../../navigation/OnboardingContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ErnährungAllergien'>;

const DIET_OPTIONS: { value: DietOption; label: string }[] = [
  { value: 'omnivore', label: 'Alles (Standard)' },
  { value: 'vegetarian', label: 'Vegetarisch' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Koscher' },
];

export default function ErnährungAllergienenScreen({ navigation }: Props) {
  const { update } = useOnboardingData();
  const [selectedAllergens, setSelectedAllergens] = useState<Set<Allergen>>(new Set());
  const [diet, setDiet] = useState<DietOption>('omnivore');

  function toggleAllergen(allergen: Allergen) {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(allergen)) next.delete(allergen);
      else next.add(allergen);
      return next;
    });
  }

  function handleWeiter() {
    update({ diet, allergies: Array.from(selectedAllergens) });
    navigation.navigate('ConsentScreen');
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Section title="Ernährungsweise">
        {DIET_OPTIONS.map((opt) => (
          <RadioRow
            key={opt.value}
            label={opt.label}
            selected={diet === opt.value}
            onPress={() => setDiet(opt.value)}
          />
        ))}
      </Section>

      <Section title="Allergien (optional)">
        <View style={styles.chips}>
          {EU14_ALLERGENS.map((allergen) => (
            <AllergenChip
              key={allergen}
              allergen={allergen}
              selected={selectedAllergens.has(allergen)}
              onToggle={() => toggleAllergen(allergen)}
            />
          ))}
        </View>
        <Text style={styles.hint}>Gerichte mit diesen Zutaten werden immer gefiltert.</Text>
      </Section>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={handleWeiter}
      >
        <Text style={styles.ctaText}>Weiter zur Einwilligung</Text>
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
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#F9FAF8' },
  container: { padding: 24, paddingBottom: 48, gap: 32 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 15, fontWeight: '600', color: '#1A2E1A',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontSize: 13, color: '#6B7F6B', marginTop: 4 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#C8D8C8', alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: '#2D6A4F' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2D6A4F' },
  radioLabel: { fontSize: 16, color: '#2C3E2C' },
  cta: {
    backgroundColor: '#2D6A4F', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
