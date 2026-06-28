import { ScrollView, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

export default function ImpressumScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
    >
      <Text style={styles.heading}>Impressum</Text>
      <Text style={styles.notice}>Angaben gemäß §5 DDG</Text>

      {/* TODO: eigene Kontaktdaten eintragen */}
      <Text style={styles.section}>Verantwortlich für den Inhalt</Text>
      <Text style={styles.body}>
        [Vorname Nachname]{'\n'}
        [Straße Hausnummer]{'\n'}
        [PLZ Ort]{'\n'}
        Deutschland
      </Text>

      <Text style={styles.section}>Kontakt</Text>
      <Text style={styles.body}>
        E-Mail: [deine@email.de]
      </Text>

      <Text style={styles.section}>Hinweis</Text>
      <Text style={styles.body}>
        Diese App ist ein privates, nicht-kommerzielles Projekt und wird unentgeltlich
        bereitgestellt. Es besteht keine gewerbliche Tätigkeit im Sinne des Umsatzsteuergesetzes.
      </Text>

      <Text style={styles.section}>Haftungshinweis Allergeninformationen</Text>
      <Text style={styles.body}>
        Die in der App angezeigten Allergeninformationen basieren auf den hinterlegten
        Zutaten-Stammdaten. Sie ersetzen nicht das Lesen der Produktverpackung.
        Kreuzkontaminationen können nicht ausgeschlossen werden. Personen mit lebensbedrohlichen
        Allergien müssen stets die Originalverpackung prüfen.
      </Text>

      <Text style={styles.meta}>Stand: Juni 2026</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.background },
  container: { padding: 24, gap: 6 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  notice: { fontSize: 14, color: colors.disabled, marginBottom: 12 },
  section: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 16 },
  body: { fontSize: 15, color: colors.text, lineHeight: 23 },
  meta: { fontSize: 13, color: colors.disabled, marginTop: 24, textAlign: 'center' },
});
