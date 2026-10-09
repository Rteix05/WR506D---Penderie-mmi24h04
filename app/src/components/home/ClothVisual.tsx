import { Image } from 'expo-image';
import { View } from 'react-native';

/**
 * Illustration de vêtement de la maquette (composant Figma « Vetements »,
 * calque « Visuel ») : pastille rose #FFB3E0 de rayon 12 et dessin rose.
 * Elle tient lieu de photo tant que l'objet n'en a pas.
 *
 * Fichiers : assets/images/figma/*.svg, téléchargés depuis Figma (accueil,
 * node 135:1797). Tailles relevées dans Figma à l'échelle de la mosaïque
 * (vignette de 44,1 × 31,7) ; `scale` agrandit le tout (cartes « Derniers
 * ajouts » : 86,8 de large, soit × 1,968).
 */
export type ClothKind = 'baskets' | 'casquette' | 'pantalon' | 'veste' | 'tshirt' | 'robe' | 'pull' | 'short' | 'echarpe' | 'cintre';

const ART: Record<Exclude<ClothKind, 'baskets'>, { source: number; w: number; h: number }> = {
  casquette: { source: require('@/assets/images/figma/casquette.svg'), w: 16.927, h: 21.485 },
  pantalon: { source: require('@/assets/images/figma/pantalon.svg'), w: 17.578, h: 21.485 },
  veste: { source: require('@/assets/images/figma/veste.svg'), w: 24.877, h: 20.487 },
  tshirt: { source: require('@/assets/images/figma/tshirt.svg'), w: 24.877, h: 20.731 },
  robe: { source: require('@/assets/images/figma/robe.svg'), w: 16.716, h: 21.632 },
  // Grille « C'est quoi ? » (node 135:2935), relevées à × 0,889 et ramenées ici à × 1.
  pull: { source: require('@/assets/images/figma/pull.svg'), w: 18.414, h: 21.484 },
  short: { source: require('@/assets/images/figma/short.svg'), w: 18.047, h: 21.484 },
  echarpe: { source: require('@/assets/images/figma/echarpe.svg'), w: 17.648, h: 21.484 },
  cintre: { source: require('@/assets/images/figma/cintre.svg'), w: 20.344, h: 12.25 },
};

// Les baskets sont deux calques empilés : le dessus et la semelle.
const BASKETS = {
  top: { source: require('@/assets/images/figma/baskets-haut.svg'), w: 20.731, h: 9.423 },
  sole: { source: require('@/assets/images/figma/baskets-semelle.svg'), w: 20.731, h: 2.356 },
};

const VISUAL = { w: 44.1, h: 31.662 };

export function ClothVisual({ kind, scale = 1 }: { kind: ClothKind; scale?: number }) {
  const size = (s: { w: number; h: number }) => ({ width: s.w * scale, height: s.h * scale });

  return (
    <View
      accessible={false}
      className="items-center justify-center overflow-hidden rounded-sm bg-[#FFB3E0]"
      style={{ ...size(VISUAL), padding: 3.392 * scale }}>
      {kind === 'baskets' ? (
        <>
          <Image source={BASKETS.top.source} style={size(BASKETS.top)} contentFit="fill" />
          <Image source={BASKETS.sole.source} style={size(BASKETS.sole)} contentFit="fill" />
        </>
      ) : (
        <Image source={ART[kind].source} style={size(ART[kind])} contentFit="fill" />
      )}
    </View>
  );
}
