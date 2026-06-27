import { Pressable, Text, StyleSheet } from 'react-native';
import type { Allergen } from '../types';

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
    borderColor: '#C8D8C8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  label: {
    fontSize: 14,
    color: '#3A4E3A',
    fontWeight: '500',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
