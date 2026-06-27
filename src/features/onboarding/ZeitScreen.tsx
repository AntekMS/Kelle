import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingData } from '../../navigation/OnboardingContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Zeit'>;

const TIME_OPTIONS: { value: number; label: string; sublabel: string }[] = [
  { value: 15, label: '< 15 Min', sublabel: 'Schnell, kein Stress' },
  { value: 30, label: '~ 30 Min', sublabel: 'Normal, entspannt' },
  { value: 60, label: 'Mehr Zeit', sublabel: 'Wenn es sein darf' },
];

export default function ZeitScreen({ navigation }: Props) {
  const { update } = useOnboardingData();
  const [selected, setSelected] = useState<number>(30);
  const insets = useSafeAreaInsets();

  function handleWeiter() {
    update({ time_budget_min: selected });
    navigation.navigate('Koennen');
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      <Text style={styles.heading}>Wie viel Zeit hast du heute?</Text>
      <Text style={styles.subheading}>Du kannst das jederzeit ändern.</Text>

      <View style={styles.options}>
        {TIME_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelected(opt.value)}
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
    flex: 1, backgroundColor: '#F9FAF8',
    padding: 24, gap: 16, justifyContent: 'space-between',
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#1A2E1A' },
  subheading: { fontSize: 15, color: '#6B7F6B' },
  options: { flex: 1, justifyContent: 'center', gap: 14 },
  card: {
    borderWidth: 1.5, borderColor: '#C8D8C8', borderRadius: 16,
    padding: 22, backgroundColor: '#FFFFFF', gap: 4,
  },
  cardSelected: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1A2E1A' },
  cardTitleSelected: { color: '#FFFFFF' },
  cardSub: { fontSize: 14, color: '#6B7F6B' },
  cardSubSelected: { color: '#B8D8C8' },
  cta: {
    backgroundColor: '#2D6A4F', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
