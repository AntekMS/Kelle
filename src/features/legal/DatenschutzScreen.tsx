import { ScrollView, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CURRENT_POLICY_VERSION } from '../../lib/policy';
import { colors } from '../../theme/colors';

export default function DatenschutzScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
    >
      <Text style={styles.heading}>Datenschutzerklärung</Text>

      <Text style={styles.section}>1. Verantwortlicher</Text>
      <Text style={styles.body}>
        [Vorname Nachname]{'\n'}
        [Straße Hausnummer, PLZ Ort]{'\n'}
        E-Mail: [deine@email.de]{'\n\n'}
        {/* TODO: eigene Kontaktdaten eintragen — §13 DSGVO-Pflichtangabe */}
      </Text>

      <Text style={styles.section}>2. Welche Daten verarbeitet werden</Text>
      <Text style={styles.body}>
        Die App verarbeitet folgende Angaben ausschließlich lokal auf deinem Gerät — ohne
        Übertragung an Server:{'\n\n'}
        • Ernährungsweise (Omnivor, Vegetarisch, Vegan, Halal, Koscher){'\n'}
        • Allergien nach EU-14-Allergenliste{'\n'}
        • Küchenausstattung, Zeitbudget, Kochtechniken{'\n'}
        • Gekochte Gerichte und Favoriten{'\n\n'}
        Allergien und religiöse Vorgaben (Halal, Koscher) gelten gemäß Art. 9 DSGVO als
        besonders schutzwürdige Daten.
      </Text>

      <Text style={styles.section}>3. Rezept-Katalog (Cloud)</Text>
      <Text style={styles.body}>
        Gerichte und Zutaten werden aus einer Cloud-Datenbank (Supabase, EU-Hosting) geladen.
        Dabei werden keinerlei Profil- oder Allergiedaten übertragen — nur anonyme
        Leseanfragen für den öffentlichen Katalog.
      </Text>

      <Text style={styles.section}>4. Rechtsgrundlage</Text>
      <Text style={styles.body}>
        Die Verarbeitung deiner Ernährungs- und Allergiedaten erfolgt auf Basis deiner
        ausdrücklichen Einwilligung gemäß Art. 9 Abs. 2 lit. a DSGVO, die du beim
        ersten App-Start erteilt hast. Die Einwilligung ist freiwillig und kann jederzeit
        widerrufen werden.
      </Text>

      <Text style={styles.section}>5. Deine Rechte (Art. 15–21 DSGVO)</Text>
      <Text style={styles.body}>
        Da alle personenbezogenen Daten nur lokal auf deinem Gerät gespeichert sind,
        kannst du sie direkt in den App-Einstellungen:{'\n\n'}
        • einsehen (Datenexport){'\n'}
        • löschen (Widerruf der Einwilligung nach Art. 7 Abs. 3 DSGVO){'\n\n'}
        Ein Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.
        Nach dem Löschen werden alle gespeicherten Daten dauerhaft entfernt.
      </Text>

      <Text style={styles.section}>6. Datensicherheit</Text>
      <Text style={styles.body}>
        Dein Profil wird mit expo-secure-store im verschlüsselten Bereich deines Geräts
        gespeichert (iOS: Keychain, Android: Keystore-Äquivalent).
      </Text>

      <Text style={styles.section}>7. Änderungen</Text>
      <Text style={styles.body}>
        Bei wesentlichen Änderungen dieser Erklärung wirst du beim nächsten App-Start zur
        erneuten Einwilligung aufgefordert. Die aktuelle Version ist {CURRENT_POLICY_VERSION}.
      </Text>

      <Text style={styles.meta}>Stand: Juni 2026 · Version {CURRENT_POLICY_VERSION}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.background },
  container: { padding: 24, gap: 6 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  section: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 16 },
  body: { fontSize: 15, color: colors.text, lineHeight: 23 },
  meta: { fontSize: 13, color: colors.disabled, marginTop: 24, textAlign: 'center' },
});
