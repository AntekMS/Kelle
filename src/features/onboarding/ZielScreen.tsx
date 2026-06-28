import { useState } from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { Goal } from '../../types';
import { useOnboardingData } from '../../navigation/OnboardingContext';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Ziel'>;

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: 'none', label: 'Einfach gut essen', description: 'Kein spezielles Ziel' },
  { value: 'high_protein', label: 'Mehr Protein', description: 'Eiweißreich, sättigend' },
  { value: 'lighter', label: 'Leichter essen', description: 'Leichte Gerichte, weniger Kalorien' },
  { value: 'low_carb', label: 'Low Carb', description: 'Weniger Kohlenhydrate' },
];

export default function ZielScreen({ navigation }: Props) {
  const { update } = useOnboardingData();
  const [selected, setSelected] = useState<Set<Goal>>(new Set(['none']));

  function toggle(goal: Goal) {
    setSelected((prev) => {
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

  function handleWeiter() {
    update({ goals: Array.from(selected) });
    navigation.navigate('Kueche');
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Was ist dir wichtig?</Text>
      <Text style={styles.subheading}>Du kannst mehreres auswählen.</Text>

      {GOALS.map((g) => {
        const isSelected = selected.has(g.value);
        return (
          <Pressable
            key={g.value}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => toggle(g.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
              {g.label}
            </Text>
            <Text style={[styles.cardDesc, isSelected && styles.cardDescSelected]}>
              {g.description}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={handleWeiter}
      >
        <Text style={styles.ctaText}>Weiter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.background },
  container: { padding: 24, paddingBottom: 48, gap: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subheading: { fontSize: 15, color: colors.textMuted, marginBottom: 8 },
  card: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    padding: 18, backgroundColor: colors.surface, gap: 4,
  },
  cardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardTitleSelected: { color: colors.surface },
  cardDesc: { fontSize: 14, color: colors.textMuted },
  cardDescSelected: { color: colors.primaryMuted },
  cta: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
});
