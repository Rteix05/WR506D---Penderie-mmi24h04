import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Icônes de la barre de navigation, reprises de la maquette
 * (design/figma-assets/nav-*.svg) et redessinées à la couleur de l'onglet
 * (rose actif, gris inactif). L'onglet Inventaire et l'onglet Logements
 * partagent le même tracé dans la maquette (nav-list1 / nav-list2).
 */
export type TabIconName = 'home' | 'inventory' | 'places' | 'profile';

const HOME =
  'M4 32C2.9 32 1.95867 31.6422 1.176 30.9266C0.392 30.2098 0 29.3486 0 28.3429V11.8857C0 11.3067 0.142 10.7581 0.426 10.24C0.708666 9.72191 1.1 9.29524 1.6 8.96L13.6 0.731429C13.9667 0.487619 14.35 0.304762 14.75 0.182857C15.15 0.0609522 15.5667 0 16 0C16.4333 0 16.85 0.0609522 17.25 0.182857C17.65 0.304762 18.0333 0.487619 18.4 0.731429L30.4 8.96C30.9 9.29524 31.292 9.72191 31.576 10.24C31.8587 10.7581 32 11.3067 32 11.8857V28.3429C32 29.3486 31.6087 30.2098 30.826 30.9266C30.042 31.6422 29.1 32 28 32H20V19.2H12V32H4Z';

const PULSE =
  'M0 11.6177H5.39077C5.61775 11.6151 5.83996 11.5522 6.03461 11.4355C6.22925 11.3189 6.38934 11.1526 6.49846 10.9537L10.9292 2.10049C11.0384 1.88007 11.2125 1.6983 11.4281 1.57961C11.6437 1.46092 11.8905 1.41098 12.1354 1.4365C12.3793 1.45297 12.612 1.54459 12.8016 1.69874C12.9912 1.8529 13.1282 2.062 13.1938 2.29723L18.6831 20.5447C18.7551 20.7922 18.9032 21.0108 19.1064 21.1697C19.3096 21.3286 19.5576 21.4196 19.8154 21.43C20.057 21.422 20.2908 21.3431 20.4878 21.2031C20.6848 21.0632 20.8362 20.8684 20.9231 20.643L24.2954 12.4046C24.3882 12.1735 24.5479 11.9753 24.7539 11.8351C24.9599 11.695 25.2031 11.6193 25.4523 11.6177H32';

const PROFILE =
  'M16 0C18.1217 0 20.1566 0.842854 21.6569 2.34315C23.1571 3.84344 24 5.87827 24 8C24 10.1217 23.1571 12.1566 21.6569 13.6569C20.1566 15.1571 18.1217 16 16 16C13.8783 16 11.8434 15.1571 10.3431 13.6569C8.84285 12.1566 8 10.1217 8 8C8 5.87827 8.84285 3.84344 10.3431 2.34315C11.8434 0.842854 13.8783 0 16 0ZM16 20C24.84 20 32 23.58 32 28V32H0V28C0 23.58 7.16 20 16 20Z';

/** Tailles de la maquette (Figma, calques « Icone » de la nav) : 20 × 20, l'onde 20 × 14,375. */
export function TabIcon({ name, color, size = 20 }: { name: TabIconName; color: ColorValue; size?: number }) {
  if (name === 'inventory' || name === 'places') {
    return (
      <Svg width={size} height={(size * 23) / 32} viewBox="0 0 32 23" fill="none" accessible={false}>
        <Path d={PULSE} stroke={color} strokeWidth={2.86} strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" accessible={false}>
      <Path d={name === 'home' ? HOME : PROFILE} fill={color} />
    </Svg>
  );
}
