import type { Href } from 'expo-router';

/**
 * Les quatre onglets de la barre et le panneau que chacun déplie (lot 28 du
 * prototype, écrans Figma 253:55877, 253:55930, 253:55988, 253:56041).
 * Une entrée sans href n'est pas encore construite : elle s'affiche
 * « Bientôt ».
 */
export type Section = 'Accueil' | 'Inventaire' | 'Logements' | 'Profil';

export type MenuEntry = { title: string; subtitle: string; href?: Href };

export const SECTIONS: Record<Section, { legend: string; entries: MenuEntry[] }> = {
  Accueil: {
    legend: 'Tout ce qui se passe',
    entries: [
      { title: 'Tableau de bord', subtitle: "Ta penderie en un coup d'œil", href: '/' },
      { title: "Fil d'actualité", subtitle: "Ce que tes amis t'ont montré" },
      { title: 'Notifications', subtitle: 'Prêts, ventes, partages, demandes' },
      { title: 'Recherche', subtitle: 'Un objet, une pièce, un ami' },
    ],
  },
  Inventaire: {
    legend: 'Tout ce que tu possèdes',
    entries: [
      { title: 'Mes objets', subtitle: 'Tes objets et leurs états', href: '/objets' },
      { title: 'Mon dressing', subtitle: 'Tes vêtements', href: '/dressing' },
      { title: 'Mes tenues', subtitle: 'Suggestions et tenues enregistrées' },
      { title: 'Mes collections', subtitle: 'Tableaux privés par défaut' },
      { title: 'Mes prêts', subtitle: 'Prêtés et empruntés' },
    ],
  },
  Logements: {
    legend: 'Où sont rangées tes affaires',
    entries: [
      { title: 'Mes logements', subtitle: 'Logements et pièces' },
      { title: 'Logement principal', subtitle: 'Ses pièces et ses objets' },
      { title: 'Mes cartons', subtitle: 'Cartons actifs' },
      { title: 'Créer un carton', subtitle: 'Étiquette, emplacement, contenu' },
    ],
  },
  Profil: {
    legend: 'Toi et tes proches',
    entries: [
      { title: 'Mon profil', subtitle: 'Informations et profils de la famille', href: '/profil' },
      { title: 'Amis et abonnés', subtitle: 'Amis, abonnés, demandes' },
      { title: 'Mes partages', subtitle: 'Partages actifs' },
      { title: 'À vendre chez mes amis', subtitle: 'Annonces de tes amis' },
      { title: 'Achats et ventes', subtitle: 'Commandes, livraisons, remboursements' },
      { title: 'Paramètres', subtitle: 'Notifications, confidentialité' },
    ],
  },
};

export const ORDER: Section[] = ['Accueil', 'Inventaire', 'Logements', 'Profil'];

/** L'onglet allumé quand aucun panneau n'est ouvert : celui de la page affichée. */
export function sectionOf(pathname: string): Section {
  if (pathname.startsWith('/profil')) return 'Profil';
  if (pathname.startsWith('/objets') || pathname.startsWith('/dressing')) return 'Inventaire';

  return 'Accueil';
}
