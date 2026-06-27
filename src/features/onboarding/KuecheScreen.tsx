import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingData } from '../../navigation/OnboardingContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Kueche'>;

const EQUIPMENT_ITEMS: { value: string; label: string; emoji: string }[] = [
  { value: 'herdplatte', label: 'Herdplatte', emoji: '🔥' },
  { value: 'ofen', label: 'Backofen', emoji: '🟫' },
  { value: 'mikrowelle', label: 'Mikrowelle', emoji: '📦' },
  { value: 'airfryer', label: 'Airfryer', emoji: '🌀' },
  { value: 'wasserkocher', label: 'Wasserkocher', emoji: '💧' },
  { value: 'mixer', label: 'Mixer', emoji: '🥤' },
];

export default function KuecheScreen({ navigation }: Props) {
  const { update } = useOnboardingData();
  const [selected, setSelected] = useState<Set<string>>(new Set(['herdplatte']));

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleWeiter() {
    update({ equipment: Array.from(selected) });
    navigation.navigate('Zeit');
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Was hast du in der Küche?</Text>
      <Text style={styles.subheading}>
        Wir zeigen dir nur Gerichte, die du damit kochen kannst.
      </Text>

      <View style={styles.grid}>
        {EQUIPMENT_ITEMS.map((item) => {
          const isSelected = selected.has(item.value);
          return (
            <Pressable
              key={item.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(item.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {item.label}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#F9FAF8' },
  container: { padding: 24, paddingBottom: 48, gap: 24 },
  heading: { fontSize: 24, fontWeight: '700', color: '#1A2E1A' },
  subheading: { fontSize: 15, color: '#6B7F6B', lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    width: '47%', borderWidth: 1.5, borderColor: '#C8D8C8', borderRadius: 14,
    padding: 16, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 8,
  },
  chipSelected: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  emoji: { fontSize: 28 },
  label: { fontSize: 15, fontWeight: '500', color: '#2C3E2C' },
  labelSelected: { color: '#FFFFFF' },
  cta: {
    backgroundColor: '#2D6A4F', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
