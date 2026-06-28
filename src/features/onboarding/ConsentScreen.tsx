import { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import ICON_IMAGES from '../../components/icon-images';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UserProfile } from '../../types';
import { saveProfile } from '../../store/profile-store';
import { useAppContext } from '../../navigation/AppContext';
import { useOnboardingData } from '../../navigation/OnboardingContext';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ConsentScreen'>;

export default function ConsentScreen(_props: Props) {
  // Checkbox starts false — NEVER pre-checked (Art. 9 Abs. 2 lit. a DSGVO)
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const { onConsentGranted } = useAppContext();
  const { data } = useOnboardingData();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();

  async function handleConsent() {
    if (!checked || saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const profile: UserProfile = {
        id: `user-${Date.now()}`,
        consent: {
          granted_at: now,
          policy_version: '1.0',
        },
        diet: data.diet,
        allergies: data.allergies,
        goals: data.goals,
        equipment: data.equipment,
        time_budget_min: data.time_budget_min,
        skill_techniques: data.skill_techniques,
        cooked_dish_ids: [],
        favorites: [],
        created_at: now,
        updated_at: now,
      };
      await saveProfile(profile);
      onConsentGranted();
    } catch {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Deine Daten, dein Gerät</Text>

      <Text style={styles.body}>
        Diese App speichert deine Ernährungspräferenzen — Diät, religiöse Vorgaben und
        Allergien — ausschließlich lokal auf diesem Gerät. Diese Daten werden{' '}
        <Text style={styles.bold}>niemals</Text> an Server übertragen oder geteilt.
      </Text>

      <Text style={styles.body}>
        Sie werden nur verwendet, um Gerichte zu filtern und zu sortieren. Du kannst
        deine Einwilligung jederzeit in den Einstellungen widerrufen und alle Daten löschen.
      </Text>

      <View style={styles.legalNote}>
        <Text style={styles.legalText}>
          Allergien und religiöse Vorgaben (z. B. Halal, Koscher) gelten nach Art. 9 DSGVO
          als besonders schutzwürdige Daten. Durch deine Einwilligung erlaubst du die
          lokale Verarbeitung dieser Daten auf deinem Gerät.
        </Text>
      </View>

      <View style={styles.linkRow}>
        <Pressable onPress={() => navigation.navigate('Datenschutz')}>
          <Text style={styles.link}>Datenschutzerklärung lesen</Text>
        </Pressable>
        <Text style={styles.linkSep}>·</Text>
        <Pressable onPress={() => navigation.navigate('Impressum')}>
          <Text style={styles.link}>Impressum</Text>
        </Pressable>
      </View>

      {/* Checkbox — NOT pre-checked, never */}
      <Pressable
        style={styles.checkboxRow}
        onPress={() => setChecked((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Ich stimme der lokalen Speicherung meiner Ernährungsdaten zu."
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Image source={ICON_IMAGES.check} style={styles.checkmarkIcon} resizeMode="contain" />}
        </View>
        <Text style={styles.checkboxLabel}>
          Ich stimme der lokalen Speicherung meiner Ernährungs- und Allergiedaten zu.
        </Text>
      </Pressable>

      <Pressable
        style={[styles.cta, (!checked || saving) && styles.ctaDisabled]}
        onPress={handleConsent}
        disabled={!checked || saving}
        accessibilityState={{ disabled: !checked || saving }}
      >
        {saving ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.ctaText}>Einwilligung erteilen und loslegen</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.background },
  container: { padding: 24, paddingBottom: 48, gap: 20 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  body: { fontSize: 16, color: colors.text, lineHeight: 24 },
  bold: { fontWeight: '700' },
  legalNote: {
    backgroundColor: colors.surfaceAlt, borderRadius: 10,
    padding: 16, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  legalText: { fontSize: 14, color: colors.text, lineHeight: 21 },
  checkboxRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 8,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmarkIcon: { width: 14, height: 14, tintColor: colors.surface },
  checkboxLabel: { fontSize: 15, color: colors.text, lineHeight: 22, flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },
  linkSep: { fontSize: 14, color: colors.disabled },
  cta: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
  },
  ctaDisabled: { backgroundColor: colors.disabled },
  ctaText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
});
