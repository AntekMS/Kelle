import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import ICON_IMAGES from '../../components/icon-images';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32 }]}>
      <View style={styles.hero}>
        <Image source={ICON_IMAGES.pan} style={styles.heroIcon} resizeMode="contain" />
        <Text style={styles.title}>Kelle</Text>
        <Text style={styles.tagline}>Einfach. Selbst. Gekocht.</Text>
      </View>

      <View style={styles.bullets}>
        <BulletItem text="Echte Kochtechniken — kein Rezept-Chaos" />
        <BulletItem text="Gerichte, die wirklich gelingen" />
        <BulletItem text="Deine Daten bleiben auf deinem Gerät" />
      </View>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={() => navigation.navigate('Ziel')}
      >
        <Text style={styles.ctaText}>Jetzt starten</Text>
      </Pressable>
    </View>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Image source={ICON_IMAGES.check} style={styles.bulletIcon} resizeMode="contain" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 48,
    fontFamily: 'Spectral_700Bold',
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bullets: {
    gap: 16,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletIcon: {
    width: 20,
    height: 20,
    marginTop: 2,
    tintColor: colors.primary,
  },
  bulletText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    flex: 1,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '600',
  },
});
