import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ClothVisual, type ClothKind } from '@/components/home/ClothVisual';
import { E1 } from '@/components/ui/elevation';
import { mediaSource } from '@/lib/api';

/**
 * Illustration de la maquette (composant Figma « Vetements ») : la
 * pastille rose en haut d'un bloc 9/7 plus haut qu'elle, dont la légende
 * est masquée dans les écrans de liste et de fiche. Le dessin paraît donc
 * un peu au-dessus du centre, comme dans Figma.
 */
export function Illustration({ kind, scale }: { kind: ClothKind; scale: number }) {
  return (
    <View style={{ height: 31.662 * scale * (9 / 7) }}>
      <ClothVisual kind={kind} scale={scale} />
    </View>
  );
}

/** Zone photo d'une carte ou d'une fiche : la photo principale, sinon l'illustration sur fond encre 4 %. */
export function PhotoArea({ photo, art, scale, height, children }: { photo?: string; art: ClothKind; scale: number; height: number; children?: ReactNode }) {
  return (
    <View style={{ height }} className="w-full items-center justify-center overflow-hidden bg-ink/[0.04] dark:bg-ink-night/[0.06]">
      {photo ? <Image source={mediaSource(photo)} style={{ width: '100%', height }} contentFit="cover" accessible={false} /> : <Illustration kind={art} scale={scale} />}
      {children}
    </View>
  );
}

/** Pastille pleine en haut à gauche de la photo (Figma « Statut/… ») : Luciole Bold 12 blanc. */
export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <View style={E1} className={`absolute left-2 top-2 rounded-full px-2 py-1 ${className}`}>
      <Text className="font-luciole-bold text-legend text-white">{label}</Text>
    </View>
  );
}

/**
 * Carte d'un bien dans une grille (Figma « Card/Object », « Card/Garment ») :
 * blanche, rayon 16, ombre e-1 ; photo pleine largeur ; nom Luciole Bold 16
 * (interligne 20), méta Luciole 12, et une ligne d'état facultative.
 * L'illustration passe à × 2,7 (pastille de 119 de large dans Figma).
 */
export function PossessionCard({
  name,
  meta,
  extra,
  photo,
  art,
  photoHeight,
  badge,
  onPress,
}: {
  name: string;
  meta: string;
  extra?: { text: string; className: string };
  photo?: string;
  art: ClothKind;
  photoHeight: number;
  badge?: { label: string; className: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, badge?.label, meta, extra?.text].filter(Boolean).join(', ')}
      onPress={onPress}
      style={E1}
      className="overflow-hidden rounded-md bg-surface active:opacity-80 dark:bg-surface-night">
      <PhotoArea photo={photo} art={art} scale={119 / 44.1} height={photoHeight}>
        {badge && <StatusBadge label={badge.label} className={badge.className} />}
      </PhotoArea>
      <View className="gap-0.5 p-3">
        <Text className="font-luciole-bold text-body leading-5 text-ink dark:text-ink-night">{name}</Text>
        {meta !== '' && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{meta}</Text>}
        {extra && <Text className={`font-luciole-bold text-legend ${extra.className}`}>{extra.text}</Text>}
      </View>
    </Pressable>
  );
}
