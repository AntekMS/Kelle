import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  SectionList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ICON_IMAGES from '../../components/icon-images';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import type { ShoppingItem, ShoppingList } from '../../types';
import {
  getActiveShoppingList,
  toggleShoppingItem,
  clearActiveShoppingList,
  removeDishFromList,
  getAllIngredients,
} from '../../db/database';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<MainStackParamList, 'ShoppingList'>;

type Section = { title: string; isPantry: boolean; data: ShoppingItem[] };

function formatAmount(amountBase: number, baseUnit: string): string {
  if (baseUnit === 'g' && amountBase >= 1000) {
    return `${(amountBase / 1000).toFixed(1).replace('.0', '')} kg`;
  }
  if (baseUnit === 'ml' && amountBase >= 1000) {
    return `${(amountBase / 1000).toFixed(1).replace('.0', '')} l`;
  }
  return `${Math.round(amountBase)} ${baseUnit}`;
}

export default function ShoppingListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingredientMap, setIngredientMap] =
    useState<Map<string, import('../../types').Ingredient>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    const [active, allIngredients] = await Promise.all([
      getActiveShoppingList(),
      getAllIngredients(),
    ]);
    setIngredientMap(new Map(allIngredients.map((i) => [i.id, i])));
    setList(active);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(itemId: string) {
    await toggleShoppingItem(itemId);
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, is_checked: !i.is_checked } : i
        ),
      };
    });
  }

  async function handleRemoveDish(dishId: string, dishName: string) {
    Alert.alert(
      `"${dishName}" entfernen`,
      'Die Zutaten dieses Gerichts werden aus der Einkaufsliste entfernt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: async () => {
            await removeDishFromList(dishId, ingredientMap);
            await load();
          },
        },
      ]
    );
  }

  function handleClearPress() {
    Alert.alert(
      'Liste leeren',
      'Alle Gerichte und Zutaten aus der Einkaufsliste entfernen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Leeren',
          style: 'destructive',
          onPress: async () => {
            await clearActiveShoppingList();
            navigation.goBack();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Keine Einkaufsliste</Text>
        <Text style={styles.emptySub}>
          Tippe auf „+ Zur Liste" auf einer Gerichtskarte, um Zutaten hinzuzufügen.
        </Text>
      </View>
    );
  }

  const buyItems = list.items.filter((i) => !i.is_pantry_staple);
  const pantryItems = list.items.filter((i) => i.is_pantry_staple);

  const aisleMap = new Map<string, ShoppingItem[]>();
  for (const item of buyItems) {
    const group = aisleMap.get(item.aisle_category) ?? [];
    group.push(item);
    aisleMap.set(item.aisle_category, group);
  }

  const sections: Section[] = [
    ...Array.from(aisleMap.entries()).map(([title, data]) => ({
      title,
      isPantry: false,
      data,
    })),
    ...(pantryItems.length > 0
      ? [{ title: 'Vorräte prüfen', isPantry: true, data: pantryItems }]
      : []),
  ];

  const checkedBuy = buyItems.filter((i) => i.is_checked).length;

  return (
    <SectionList<ShoppingItem, Section>
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      ListHeaderComponent={
        <View>
          <View style={styles.dishesCard}>
            <Text style={styles.dishesLabel}>Für diese Gerichte:</Text>
            {list.dishes.map((d) => (
              <View key={d.dish_id} style={styles.dishRow}>
                <Text style={styles.dishName}>{d.dish_name}</Text>
                <Pressable
                  onPress={() => handleRemoveDish(d.dish_id, d.dish_name)}
                  hitSlop={8}
                  accessibilityLabel={`${d.dish_name} entfernen`}
                >
                  <Image source={ICON_IMAGES.close} style={styles.removeIcon} resizeMode="contain" />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progress}>
              {checkedBuy}/{buyItems.length} erledigt
            </Text>
            <Pressable onPress={handleClearPress} style={styles.clearButton}>
              <Text style={styles.clearText}>Liste leeren</Text>
            </Pressable>
          </View>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionHeader, section.isPantry && styles.pantryHeader]}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.item, item.is_checked && styles.itemChecked]}
          onPress={() => handleToggle(item.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.is_checked }}
        >
          <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
            {item.is_checked && <Image source={ICON_IMAGES.check} style={styles.checkmarkIcon} resizeMode="contain" />}
          </View>
          <Text
            style={[
              styles.itemName,
              item.is_checked && styles.itemNameChecked,
              item.is_pantry_staple && styles.itemNamePantry,
            ]}
          >
            {item.ingredient_name}
          </Text>
          <Text style={[styles.itemAmount, item.is_checked && styles.itemAmountChecked]}>
            {formatAmount(item.amount_base, item.base_unit)}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  list: { padding: 16, backgroundColor: colors.background },
  dishesCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dishesLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  dishRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dishName: { fontSize: 15, color: colors.text, fontWeight: '500', flex: 1 },
  removeIcon: { width: 16, height: 16, tintColor: colors.disabled, marginLeft: 8 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progress: { fontSize: 14, color: colors.text, fontWeight: '500' },
  clearButton: { paddingHorizontal: 8, paddingVertical: 4 },
  clearText: { fontSize: 14, color: colors.error },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.background,
  },
  pantryHeader: { color: colors.disabled, marginTop: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemChecked: { backgroundColor: colors.surfaceAlt },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmarkIcon: { width: 13, height: 13, tintColor: colors.surface },
  itemName: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  itemNameChecked: { color: colors.disabled, textDecorationLine: 'line-through' },
  itemNamePantry: { color: colors.textMuted },
  itemAmount: { fontSize: 14, color: colors.textMuted },
  itemAmountChecked: { color: colors.disabled },
});
