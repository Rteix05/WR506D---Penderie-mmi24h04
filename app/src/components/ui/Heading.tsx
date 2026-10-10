import { Platform, Text, type TextProps } from 'react-native';

/**
 * Titre en Typolio (DS §4 : h3 pour le titre d'écran, h4 pour un titre de
 * fiche, de panneau ou de carte). Tout texte en Typolio passe par ici.
 *
 * Pourquoi un composant : Typolio a des métriques hors norme. Sa boîte fait
 * 1,7 fois la taille (ascendante 1, descendante 0,7) alors que les capitales
 * ne font que 0,7. Avec l'interligne du DS (38 px pour 32 px), plus petit
 * que cette boîte :
 *  - iOS garde le bas de la boîte et coupe le haut : le haut des lettres
 *    était effacé (« BONJOUR » tronqué sur l'accueil) ;
 *  - Android centre la boîte : rien n'est coupé, mais les capitales
 *    remontent vers le haut de la ligne.
 * On décale donc le texte vers le bas (paddingTop) pour centrer les
 * capitales dans la ligne, et on rend la place en dessous (marginBottom
 * négatif) : la mise en page garde exactement l'interligne du DS, sur
 * plusieurs lignes comme sur une seule.
 */
const SIZES = {
  h3: { fontSize: 32, lineHeight: 38, className: 'font-typolio text-h3' },
  h4: { fontSize: 24, lineHeight: 30, className: 'font-typolio text-h4' },
} as const;

/** Décalage qui centre les capitales (0,7 em) dans la ligne. */
function offset(fontSize: number, lineHeight: number): number {
  // iOS : ligne de base à lineHeight − 0,7 em du haut. Au moins assez pour
  // que l'ascendante entière (accents des capitales : É, À) reste visible.
  // Android : boîte centrée, rien n'est coupé, on recentre seulement.
  const shift = Platform.OS === 'ios' ? Math.max((2.1 * fontSize - lineHeight) / 2, 1.7 * fontSize - lineHeight) : 0.2 * fontSize;

  return Math.max(0, Math.round(shift));
}

type Props = TextProps & { level: keyof typeof SIZES; className?: string };

export function Heading({ level, className = '', style, ...props }: Props) {
  const size = SIZES[level];
  const shift = offset(size.fontSize, size.lineHeight);

  return <Text {...props} className={`${size.className} ${className}`} style={[{ paddingTop: shift, marginBottom: -shift }, style]} />;
}
