import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import type { UserProfile } from '../../types';
import { saveProfile } from '../../store/profile-store';
import { useAppContext } from '../../navigation/AppContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ConsentScreen'>;

export default function ConsentScreen({ route }: Props) {
  // Checkbox starts as false — NEVER pre-checked (Art. 9 Abs. 2 lit. a DSGVO)
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const { onConsentGranted } = useAppContext();

  async function handleConsent() {
    if (!checked || saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const profile: UserProfile = {
        id: `user-${Date.now()}`,
        consent: {
          timestamp: now,
          policy_version: '1.0',
          granted: true,
        },
        allergies: route.params.allergies,
        diet: route.params.diet,
        religious_restriction: route.params.religious_restriction,
        cooked_dish_ids: [],
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Deine Daten, dein Gerät</Text>

      <Text style={styles.body}>
        Diese App speichert deine Ernährungspräferenzen — Allergien, Diät und religiöse
        Vorgaben — ausschließlich lokal auf diesem Gerät. Diese Daten werden{' '}
        <Text style={styles.bold}>niemals</Text> an Server übertragen oder mit Dritten
        geteilt.
      </Text>
      <Text style={styles.body}>
        Die Daten werden ausschließlich verwendet, um Gerichte zu filtern und
        zu sortieren. Du kannst deine Einwilligung jederzeit in den Einstellungen
        widerrufen und alle gespeicherten Daten löschen.
      </Text>

      <View style={styles.legalNote}>
        <Text style={styles.legalText}>
          Allergien und religiöse Vorgaben gelten nach Art. 9 DSGVO als besonders
          schutzwürdige Daten. Durch deine Einwilligung erlaubst du uns, diese Daten
          lokal auf deinem Gerät zu verarbeiten.
        </Text>
      </View>

      {/* Checkbox — NOT pre-checked */}
      <Pressable
        style={styles.checkboxRow}
        onPress={() => setChecked((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Ich stimme der lokalen Speicherung meiner Ernährungsdaten zu."
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          Ich stimme der lokalen Speicherung meiner Ernährungsdaten zu.
        </Text>
      </Pressable>

      <Pressable
        style={[styles.cta, (!checked || saving) && styles.ctaDisabled]}
        onPress={handleConsent}
        disabled={!checked || saving}
        accessibilityState={{ disabled: !checked || saving }}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.ctaText}>Einwilligung erteilen und loslegen</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#F9FAF8' },
  container: {
    padding: 24,
    paddingBottom: 48,
    gap: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A2E1A',
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    color: '#2C3E2C',
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
  },
  legalNote: {
    backgroundColor: '#EDF5EF',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2D6A4F',
  },
  legalText: {
    fontSize: 14,
    color: '#3A4E3A',
    lineHeight: 21,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C8D8C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#2C3E2C',
    lineHeight: 22,
    flex: 1,
  },
  cta: {
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaDisabled: {
    backgroundColor: '#A8C4AF',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
