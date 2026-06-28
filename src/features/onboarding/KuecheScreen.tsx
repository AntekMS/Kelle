import { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingData } from '../../navigation/OnboardingContext';
import { colors } from '../../theme/colors';
import ICON_IMAGES from '../../components/icon-images';
import { EQUIPMENT_META } from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Kueche'>;

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
        {EQUIPMENT_META.map((item) => {
          const isSelected = selected.has(item.value);
          return (
            <Pressable
              key={item.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(item.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Image
                source={ICON_IMAGES[item.iconKey]}
                style={[styles.equipmentIcon, isSelected && styles.equipmentIconSelected]}
                resizeMode="contain"
              />
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
  scroll: { backgroundColor: colors.background },
  container: { padding: 24, paddingBottom: 48, gap: 24 },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  subheading: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    width: '47%', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    padding: 16, backgroundColor: colors.surface, alignItems: 'center', gap: 8,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  equipmentIcon: { width: 40, height: 40 },
  equipmentIconSelected: { tintColor: colors.surface },
  label: { fontSize: 15, fontWeight: '500', color: colors.text },
  labelSelected: { color: colors.surface },
  cta: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
});
