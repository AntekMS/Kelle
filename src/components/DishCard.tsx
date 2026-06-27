import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Dish } from '../types';

interface DishCardProps {
  dish: Dish;
  isCooked: boolean;
  onMarkCooked: (dishId: string) => void;
}

export default function DishCard({ dish, isCooked, onMarkCooked }: DishCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{dish.name}</Text>
        {isCooked && <Text style={styles.cookedBadge}>✓ Gekocht</Text>}
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {dish.description}
      </Text>

      <View style={styles.meta}>
        <DifficultyDots level={dish.difficulty} />
        <Text style={styles.metaText}>· {dish.time_minutes} Min.</Text>
        {dish.diet_tags.includes('vegan') && (
          <Text style={styles.tag}>🌱 Vegan</Text>
        )}
        {!dish.diet_tags.includes('vegan') && dish.diet_tags.includes('vegetarian') && (
          <Text style={styles.tag}>🥦 Vegetarisch</Text>
        )}
      </View>

      <Pressable
        style={[styles.button, isCooked && styles.buttonDisabled]}
        onPress={() => onMarkCooked(dish.id)}
        disabled={isCooked}
        accessibilityLabel={
          isCooked ? 'Bereits als gekocht markiert' : 'Als gekocht markieren'
        }
      >
        <Text style={[styles.buttonText, isCooked && styles.buttonTextDisabled]}>
          {isCooked ? 'Bereits gekocht' : 'Als gekocht markieren'}
        </Text>
      </Pressable>
    </View>
  );
}

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <View style={styles.dots}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[styles.dot, i <= level && styles.dotFilled]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2E1A',
    flex: 1,
  },
  cookedBadge: {
    fontSize: 13,
    color: '#2D6A4F',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#4A5E4A',
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7F6B',
  },
  tag: {
    fontSize: 13,
    color: '#4A5E4A',
    marginLeft: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0E4D4',
  },
  dotFilled: {
    backgroundColor: '#2D6A4F',
  },
  button: {
    backgroundColor: '#EDF5EF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#F3F7F3',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D6A4F',
  },
  buttonTextDisabled: {
    color: '#A8C4AF',
  },
});
