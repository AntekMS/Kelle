import type { ImageSourcePropType } from 'react-native';

const ICON_IMAGES: Record<string, ImageSourcePropType> = {
  // Branding
  pan:             require('../../assets/icons/icon_pan.png'),

  // UI-Aktionen
  check:           require('../../assets/icons/icon_check.png'),
  close:           require('../../assets/icons/icon_close.png'),
  heart_filled:    require('../../assets/icons/icon_heart_filled.png'),
  heart_outline:   require('../../assets/icons/icon_heart_outline.png'),

  // Navigation
  // TODO: ersetzen durch assets/icons/icon_settings.png wenn verfügbar
  settings:        require('../../assets/icons/icon_technique.png'),
  // TODO: ersetzen durch assets/icons/icon_cart.png (Warenkorb/Einkaufskorb) wenn verfügbar
  shopping:        require('../../assets/icons/icon_check.png'),
  // TODO: ersetzen durch assets/icons/icon_person.png (Profil/Avatar) wenn verfügbar
  profil:          require('../../assets/icons/icon_technique.png'),

  // Metadaten auf Gericht-Cards
  time:            require('../../assets/icons/icon_time.png'),
  technique:       require('../../assets/icons/icon_technique.png'),

  // Diät-Tags
  vegan:           require('../../assets/icons/icon_vegan.png'),
  vegetarisch:     require('../../assets/icons/icon_vegetarisch.png'),

  // Equipment (KuecheScreen)
  herdplatte:      require('../../assets/icons/icon_herdplatte.png'),
  backofen:        require('../../assets/icons/icon_backofen.png'),
  mikrowelle:      require('../../assets/icons/icon_mikrowelle.png'),
  airfryer:        require('../../assets/icons/icon_airfryer.png'),
  wasserkocher:    require('../../assets/icons/icon_wasserkocher.png'),
  mixer:           require('../../assets/icons/icon_mixer.png'),
};

export default ICON_IMAGES;
