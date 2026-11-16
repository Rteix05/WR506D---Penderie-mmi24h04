import type { Href } from 'expo-router';

import i18n from '@/i18n';

/**
 * Les quatre onglets de la barre et le panneau que chacun déplie (lot 28 du
 * prototype, écrans Figma 253:55877, 253:55930, 253:55988, 253:56041).
 * Une entrée sans href n'est pas encore construite : elle s'affiche
 * « Bientôt ».
 */
export type Section = 'Accueil' | 'Inventaire' | 'Logements' | 'Profil';

export type MenuEntry = { title: string; subtitle: string; href?: Href };

/** La section est un identifiant : sa clé de traduction, pas son libellé. */
const SECTION_KEY: Record<Section, string> = {
  Accueil: 'accueil',
  Inventaire: 'inventaire',
  Logements: 'logements',
  Profil: 'profil',
};

/** Le libellé de l'onglet, à appeler au moment du rendu. */
export function sectionLabel(section: Section): string {
  return i18n.t(`common:navigation.sections.${SECTION_KEY[section]}.title`);
}

function menuEntry(section: Section, key: string, href?: Href): MenuEntry {
  return {
    title: i18n.t(`common:navigation.sections.${SECTION_KEY[section]}.${key}.title`),
    subtitle: i18n.t(`common:navigation.sections.${SECTION_KEY[section]}.${key}.subtitle`),
    href,
  };
}

/** Les panneaux, traduits au moment du rendu (jamais au chargement du module). */
export function sections(): Record<Section, { title: string; legend: string; entries: MenuEntry[] }> {
  return {
    Accueil: {
      title: sectionLabel('Accueil'),
      legend: i18n.t('common:navigation.sections.accueil.legend'),
      entries: [
        menuEntry('Accueil', 'dashboard', '/'),
        menuEntry('Accueil', 'feed', '/fil'),
        menuEntry('Accueil', 'notifications'),
        menuEntry('Accueil', 'search'),
      ],
    },
    Inventaire: {
      title: sectionLabel('Inventaire'),
      legend: i18n.t('common:navigation.sections.inventaire.legend'),
      entries: [
        menuEntry('Inventaire', 'objects', '/objets'),
        menuEntry('Inventaire', 'wardrobe', '/dressing'),
        menuEntry('Inventaire', 'outfits'),
        menuEntry('Inventaire', 'collections'),
        menuEntry('Inventaire', 'loans', '/prets'),
      ],
    },
    Logements: {
      title: sectionLabel('Logements'),
      legend: i18n.t('common:navigation.sections.logements.legend'),
      entries: [
        menuEntry('Logements', 'places', '/logements'),
        menuEntry('Logements', 'main', '/logements/principal'),
        menuEntry('Logements', 'boxes', '/logements/cartons'),
        menuEntry('Logements', 'createBox', '/nouveau-carton/infos'),
      ],
    },
    Profil: {
      title: sectionLabel('Profil'),
      legend: i18n.t('common:navigation.sections.profil.legend'),
      entries: [
        menuEntry('Profil', 'profile', '/profil'),
        menuEntry('Profil', 'friends'),
        menuEntry('Profil', 'shares'),
        menuEntry('Profil', 'selling'),
        menuEntry('Profil', 'purchases'),
        menuEntry('Profil', 'settings'),
      ],
    },
  };
}

export const ORDER: Section[] = ['Accueil', 'Inventaire', 'Logements', 'Profil'];

/** L'onglet allumé quand aucun panneau n'est ouvert : celui de la page affichée. */
export function sectionOf(pathname: string): Section {
  if (pathname.startsWith('/profil')) return 'Profil';
  if (pathname.startsWith('/objets') || pathname.startsWith('/dressing') || pathname.startsWith('/prets')) return 'Inventaire';
  if (pathname.startsWith('/logements')) return 'Logements';

  return 'Accueil';
}
