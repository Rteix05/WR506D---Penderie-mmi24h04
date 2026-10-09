import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Pressable, Text, View } from 'react-native';

import { ClothVisual, type ClothKind } from '@/components/home/ClothVisual';

type Props = {
  photo: ImagePickerAsset | null;
  /** Dessin affiché tant qu'il n'y a pas de photo. */
  art: ClothKind;
  caption?: string;
  height?: number;
  onPress?: () => void;
};

/**
 * Zone photo des écrans d'ajout (Figma « Photo » : encre 6 %, rayon 24) :
 * la photo prise si on en a une, sinon l'illustration de la maquette
 * (vignette rose agrandie × 2,27, comme dans Figma) et une légende.
 */
export function PhotoZone({ photo, art, caption, height = 200, onPress }: Props) {
  const content = (
    <View style={{ height }} className="items-center justify-center gap-4 overflow-hidden rounded-lg bg-ink/[0.06] dark:bg-ink-night/10">
      {photo ? (
        <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="Ta photo" />
      ) : (
        <ClothVisual kind={art} scale={2.27} />
      )}
      {caption && !photo && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{caption}</Text>}
    </View>
  );

  if (!onPress) return <View className="px-5">{content}</View>;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={caption ?? 'Photo'} onPress={onPress} className="px-5 active:opacity-80">
      {content}
    </Pressable>
  );
}
