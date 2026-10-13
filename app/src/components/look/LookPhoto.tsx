import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { mediaSource } from '@/lib/api';
import type { Look, LookBox, LookTag, LookTagStatus } from '@/lib/look';

/** Couleur d'un point : vert confirmé, violet reconnu (à confirmer), rose nouveau, gris inconnu. */
export const DOT: Record<LookTagStatus, string> = {
  CONFIRMED: 'bg-main',
  MATCHED: 'bg-cloth',
  NEW: 'bg-primary',
  UNKNOWN: 'bg-muted',
};

/** Rond d'un point, 28 px, numéroté à partir de 1 (comme dans la liste en dessous). */
export function Dot({ tag, size = 28 }: { tag: Pick<LookTag, 'position' | 'status'>; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={`items-center justify-center border-2 border-white ${DOT[tag.status]}`}>
      <Text className="font-luciole-bold text-legend text-white">{tag.position + 1}</Text>
    </View>
  );
}

/** Ce qu'il faut d'un point pour le dessiner (un point du look, ou une mention du fil). */
export type PhotoTag = Pick<LookTag, 'id' | 'x' | 'y' | 'position' | 'status'>;

type Props = {
  look: { photo: Look['photo']; tags: PhotoTag[] };
  /** Touche sur la photo : position relative (0 à 1). Sans onPlace, la photo est en lecture seule. */
  onPlace?: (x: number, y: number) => void;
  /** Le point en cours d'analyse par l'IA. */
  pending?: { x: number; y: number } | null;
  /** Arrondi des coins (la 1re image du post est carrée de bord à bord). */
  rounded?: boolean;
  /** Toucher un point : une mention, dans le fil. tagLabel le décrit au lecteur d'écran. */
  onTagPress?: (tag: PhotoTag) => void;
  tagLabel?: (tag: PhotoTag) => string;
  /** Le contour de chaque vêtement délimité par l'IA, dessiné sous les points. */
  outlines?: Outline[];
};

/** Un contour : le rectangle du vêtement sur la photo (de 0 à 1), à la couleur de son point. */
export type Outline = { key: string; box: LookBox; status: LookTagStatus };

const OUTLINE: Record<LookTagStatus, string> = {
  CONFIRMED: 'border-main bg-main/10',
  MATCHED: 'border-cloth bg-cloth/10',
  NEW: 'border-primary bg-primary/10',
  UNKNOWN: 'border-muted bg-muted/10',
};

/**
 * La photo du look, à son format, avec un rond numéroté par vêtement et,
 * autour, le contour du vêtement que l'IA a délimité. En préparation,
 * toucher la photo pose un point à cet endroit ; dans le fil, toucher un
 * point ouvre sa mention.
 */
export function LookPhoto({ look, onPlace, pending, rounded = true, onTagPress, tagLabel, outlines = [] }: Props) {
  const [width, setWidth] = useState(0);
  const ratio = look.photo.width && look.photo.height ? look.photo.height / look.photo.width : 4 / 3;
  const height = width * ratio;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const place = (e: GestureResponderEvent) => {
    if (!onPlace || width === 0) return;
    const x = Math.min(Math.max(e.nativeEvent.locationX / width, 0), 1);
    const y = Math.min(Math.max(e.nativeEvent.locationY / height, 0), 1);
    onPlace(x, y);
  };

  return (
    <View onLayout={onLayout} className={`w-full overflow-hidden bg-ink/[0.04] dark:bg-ink-night/[0.06] ${rounded ? 'rounded-lg' : ''}`} style={{ height: height || undefined, aspectRatio: height ? undefined : 1 / ratio }}>
      <Pressable
        accessibilityRole={onPlace ? 'button' : 'image'}
        accessibilityLabel={onPlace ? 'Ta photo : touche un vêtement pour y poser un point' : `Ta photo, ${look.tags.length} vêtements pointés`}
        disabled={!onPlace || Boolean(pending)}
        onPress={place}
        style={{ width: '100%', height: '100%' }}>
        <Image source={mediaSource(look.photo.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" accessible={false} />
      </Pressable>
      {width > 0 &&
        outlines.map(({ key, box, status }) => (
          <View
            key={key}
            pointerEvents="none"
            className={`rounded-md border-2 border-dashed ${OUTLINE[status]}`}
            style={{ position: 'absolute', left: box.x0 * width, top: box.y0 * height, width: (box.x1 - box.x0) * width, height: (box.y1 - box.y0) * height }}
          />
        ))}
      {width > 0 &&
        look.tags.map((tag) =>
          onTagPress ? (
            <Pressable
              key={tag.id}
              accessibilityRole="button"
              accessibilityLabel={tagLabel?.(tag) ?? `Vêtement ${tag.position + 1}`}
              onPress={() => onTagPress(tag)}
              hitSlop={10}
              style={{ position: 'absolute', left: tag.x * width - 14, top: tag.y * height - 14 }}>
              <Dot tag={tag} />
            </Pressable>
          ) : (
            <View key={tag.id} pointerEvents="none" style={{ position: 'absolute', left: tag.x * width - 14, top: tag.y * height - 14 }}>
              <Dot tag={tag} />
            </View>
          ),
        )}
      {width > 0 && pending && (
        <View pointerEvents="none" style={{ position: 'absolute', left: pending.x * width - 16, top: pending.y * height - 16 }} className="h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ink/60">
          <ActivityIndicator color="#FFFFFF" size="small" />
        </View>
      )}
    </View>
  );
}
