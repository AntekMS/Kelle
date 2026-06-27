import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32 }]}>
      <View style={styles.hero}>
        <Text style={styles.icon}>🍳</Text>
        <Text style={styles.title}>Küchen-Coach</Text>
        <Text style={styles.tagline}>Kochen lernen, Schritt für Schritt.</Text>
      </View>

      <View style={styles.bullets}>
        <BulletItem text="Echte Kochtechniken — kein Rezept-Chaos" />
        <BulletItem text="Gerichte, die wirklich gelingen" />
        <BulletItem text="Deine Daten bleiben auf deinem Gerät" />
      </View>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={() => navigation.navigate('AllergenSetup')}
      >
        <Text style={styles.ctaText}>Jetzt starten</Text>
      </Pressable>
    </View>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>✓</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAF8',
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A2E1A',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    color: '#4A5E4A',
    textAlign: 'center',
    lineHeight: 24,
  },
  bullets: {
    gap: 16,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletDot: {
    fontSize: 16,
    color: '#2D6A4F',
    fontWeight: '600',
    lineHeight: 24,
  },
  bulletText: {
    fontSize: 16,
    color: '#2C3E2C',
    lineHeight: 24,
    flex: 1,
  },
  cta: {
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
