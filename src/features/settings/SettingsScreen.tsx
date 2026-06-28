import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/types';
import { loadProfile, deleteProfile } from '../../store/profile-store';
import { useAppContext } from '../../navigation/AppContext';
import { CURRENT_POLICY_VERSION } from '../../lib/policy';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { onDeleteProfile } = useAppContext();

  async function handleExport() {
    const profile = await loadProfile();
    if (!profile) {
      Alert.alert('Keine Daten', 'Es sind keine gespeicherten Daten vorhanden.');
      return;
    }
    Alert.alert(
      'Meine Daten (JSON)',
      JSON.stringify(profile, null, 2),
      [{ text: 'Schließen' }]
    );
  }

  function handleDeletePress() {
    Alert.alert(
      'Profil löschen',
      'Alle Einstellungen, Allergien, Ziele und der Einwilligungsstatus werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            await deleteProfile();
            onDeleteProfile();
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
    >
      <Text style={styles.sectionHeader}>DSGVO-Betroffenenrechte</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={handleExport} accessibilityLabel="Profildaten als JSON exportieren">
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Daten einsehen</Text>
            <Text style={styles.rowSub}>Profil als Text anzeigen (Art. 15 DSGVO)</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.row} onPress={handleDeletePress} accessibilityLabel="Profil und alle gespeicherten Daten löschen">
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, styles.danger]}>Profil löschen</Text>
            <Text style={styles.rowSub}>Einwilligung widerrufen, alle Daten entfernen</Text>
          </View>
          <Text style={[styles.arrow, styles.danger]}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionHeader}>Rechtliches</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={() => navigation.navigate('Datenschutz')} accessibilityLabel="Datenschutzerklärung öffnen">
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Datenschutzerklärung</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.row} onPress={() => navigation.navigate('Impressum')} accessibilityLabel="Impressum öffnen">
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Impressum</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.versionText}>Kelle · Policy {CURRENT_POLICY_VERSION}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.background },
  container: { padding: 16, gap: 8 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, color: colors.text, fontWeight: '500' },
  rowSub: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  arrow: { fontSize: 20, color: colors.border, fontWeight: '300' },
  danger: { color: colors.error },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },
  versionText: { fontSize: 13, color: colors.disabled, textAlign: 'center', marginTop: 16 },
});
