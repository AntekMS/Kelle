import { EQUIPMENT_OPTIONS, EQUIPMENT_META } from '../index';
import ICON_IMAGES from '../../components/icon-images';

describe('EQUIPMENT_META ↔ EQUIPMENT_OPTIONS Konsistenz', () => {
  test('jede EQUIPMENT_OPTIONS hat genau einen Meta-Eintrag (kein Drift)', () => {
    const metaValues = EQUIPMENT_META.map((m) => m.value).sort();
    const options = [...EQUIPMENT_OPTIONS].sort();
    expect(metaValues).toEqual(options);
  });

  test('keine doppelten Meta-Werte', () => {
    const values = EQUIPMENT_META.map((m) => m.value);
    expect(new Set(values).size).toBe(values.length);
  });

  test('jeder iconKey ist in ICON_IMAGES vorhanden', () => {
    for (const item of EQUIPMENT_META) {
      expect(ICON_IMAGES[item.iconKey]).toBeDefined();
    }
  });

  test('jedes Gerät hat ein nicht-leeres Label', () => {
    for (const item of EQUIPMENT_META) {
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});
