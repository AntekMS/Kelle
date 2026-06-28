import { Pressable, Text, StyleSheet } from 'react-native';
import type { Allergen } from '../types';
import { colors } from '../theme/colors';

const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  crustaceans: 'Krebstiere',
  eggs: 'Eier',
  fish: 'Fisch',
  peanuts: 'Erdnüsse',
  soybeans: 'Soja',
  milk: 'Milch',
  nuts: 'Schalenfrüchte',
  celery: 'Sellerie',
  mustard: 'Senf',
  sesame: 'Sesam',
  sulphites: 'Sulfite',
  lupin: 'Lupinen',
  molluscs: 'Weichtiere',
};

interface Props {
  allergen: Allergen;
  selected: boolean;
  onToggle: () => void;
}

export default function AllergenChip({ allergen, selected, onToggle }: Props) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${ALLERGEN_LABELS[allergen]} ${selected ? 'ausgewählt' : 'nicht ausgewählt'}`}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {ALLERGEN_LABELS[allergen]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  labelSelected: {
    color: colors.surface,
  },
});
