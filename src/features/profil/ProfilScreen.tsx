import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { Dish, UserProfile } from '../../types';
import type { FeedStackParamList, MainTabParamList } from '../../navigation/types';
import { loadProfile } from '../../store/profile-store';
import { initDatabase, getAllDishes } from '../../db/database';
import {
  ALLERGEN_LABELS,
  DIET_LABELS,
  GOAL_LABELS,
  equipmentLabel,
  formatTimeBudget,
} from '../../lib/labels';
import { colors } from '../../theme/colors';

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishesById, setDishesById] = useState<Map<string, Dish>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (active: () => boolean) => {
    setError(false);
    try {
      // initDatabase ist idempotent (CREATE TABLE IF NOT EXISTS) — nicht darauf verlassen,
      // dass FeedScreen zuerst geseedet hat.
      await initDatabase();
      const [loadedProfile, allDishes] = await Promise.all([loadProfile(), getAllDishes()]);
      if (!active()) return;
      setProfile(loadedProfile);
      setDishesById(new Map(allDishes.map((d) => [d.id, d])));
    } catch {
      if (active()) setError(true);
    } finally {
      if (active()) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      load(() => isActive);
      return () => { isActive = false; };
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Profil konnte nicht geladen werden</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => { setLoading(true); load(() => true); }}
          accessibilityLabel="Erneut versuchen"
        >
          <Text style={styles.retryText}>Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Kein Profil gefunden</Text>
      </View>
    );
  }

  const allergies = profile.allergies.map((a) => ALLERGEN_LABELS[a]).join(', ');
  const goals = profile.goals.filter((g) => g !== 'none').map((g) => GOAL_LABELS[g]).join(', ');
  const equipment = profile.equipment.map(equipmentLabel).join(', ');
  const cookedDishes = profile.cooked_dish_ids
    .map((id) => dishesById.get(id))
    .filter((d): d is Dish => d != null);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
    >
      <Text style={styles.privacyNote}>Diese Daten bleiben auf deinem Gerät.</Text>

      <Text style={styles.sectionHeader}>Ernährung & Allergien</Text>
      <View style={styles.card}>
        <SummaryRow label="Ernährungsweise" value={DIET_LABELS[profile.diet]} />
        <Divider />
        <SummaryRow label="Allergien" value={allergies || 'Keine angegeben'} />
      </View>

      <Text style={styles.sectionHeader}>Ziele & Zeit</Text>
      <View style={styles.card}>
        <SummaryRow label="Ziele" value={goals || 'Keins'} />
        <Divider />
        <SummaryRow label="Zeitbudget" value={formatTimeBudget(profile.time_budget_min)} />
      </View>

      <Text style={styles.sectionHeader}>Meine Küche</Text>
      <View style={styles.card}>
        <SummaryRow label="Geräte" value={equipment || 'Keine angegeben'} />
      </View>

      <Text style={styles.sectionHeader}>
        Schon gekocht{cookedDishes.length > 0 ? ` (${cookedDishes.length})` : ''}
      </Text>
      <View style={styles.card}>
        {cookedDishes.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowSub}>Noch nichts gekocht — markiere Gerichte als „gekocht".</Text>
          </View>
        ) : (
          cookedDishes.map((dish, index) => (
            <View key={dish.id}>
              {index > 0 && <Divider />}
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('DishDetail', { dishId: dish.id })}
                accessibilityLabel={`${dish.name} – Rezept öffnen`}
                accessibilityRole="button"
              >
                <Text style={styles.rowTitle}>{dish.name}</Text>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, styles.settingsCard]}>
        <Pressable
          style={styles.row}
          onPress={() =>
            navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('SettingsTab')
          }
          accessibilityLabel="Zu den Einstellungen"
          accessibilityRole="button"
        >
          <Text style={styles.rowTitle}>Einstellungen & Datenschutz</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, gap: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  retryButton: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  privacyNote: { fontSize: 13, color: colors.textMuted, paddingHorizontal: 4, paddingBottom: 8 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 6,
  },
  card: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  settingsCard: { marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  rowLabel: { fontSize: 15, color: colors.textMuted },
  rowValue: { fontSize: 15, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  rowTitle: { fontSize: 16, color: colors.text, fontWeight: '500', flex: 1 },
  rowSub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  arrow: { fontSize: 20, color: colors.border, fontWeight: '300' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },
});
