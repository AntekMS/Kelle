import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingData } from '../../navigation/OnboardingContext';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Koennen'>;

const SKILL_OPTIONS: { label: string; sublabel: string; techniques: string[] }[] = [
  {
    label: 'Fange gerade an',
    sublabel: 'Ich koche selten oder noch gar nicht.',
    techniques: [],
  },
  {
    label: 'Geht so',
    sublabel: 'Ich kann Nudeln kochen und Eier braten.',
    techniques: ['niedrige-hitze', 'kochen'],
  },
  {
    label: 'Bin schon sicher',
    sublabel: 'Ich kann Saucen machen und anbraten.',
    techniques: ['niedrige-hitze', 'kochen', 'aromatisieren', 'anbraten', 'sauce'],
  },
];

export default function KoennenScreen({ navigation }: Props) {
  const { update } = useOnboardingData();
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const insets = useSafeAreaInsets();

  function handleWeiter() {
    update({ skill_techniques: SKILL_OPTIONS[selectedIdx].techniques });
    navigation.navigate('ErnährungAllergien');
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      <Text style={styles.heading}>Was kannst du schon?</Text>
      <Text style={styles.subheading}>
        Ehrlich — kein Werturteil. Das hilft uns, dir das Richtige zu zeigen.
      </Text>

      <View style={styles.options}>
        {SKILL_OPTIONS.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <Pressable
              key={idx}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelectedIdx(idx)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                {opt.label}
              </Text>
              <Text style={[styles.cardSub, isSelected && styles.cardSubSelected]}>
                {opt.sublabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={handleWeiter}
      >
        <Text style={styles.ctaText}>Weiter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    padding: 24, gap: 16, justifyContent: 'space-between',
  },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  subheading: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  options: { flex: 1, justifyContent: 'center', gap: 14 },
  card: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 16,
    padding: 22, backgroundColor: colors.surface, gap: 6,
  },
  cardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardTitleSelected: { color: colors.surface },
  cardSub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  cardSubSelected: { color: colors.primaryMuted },
  cta: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
});
