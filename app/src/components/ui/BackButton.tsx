import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { E1 } from '@/components/ui/elevation';

/**
 * Button / Icon / Retour de la lib Figma (boutonRetour() : rond blanc de
 * 40 px, ombre e-1, glyphe « < », ou « X » pour fermer une modale). La zone
 * tactile est élargie à 44 px (hitSlop) pour la cible minimale RAAM.
 */
export function BackButton({ close = false }: { close?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={close ? 'Fermer' : 'Retour'}
      onPress={() => router.back()}
      hitSlop={4}
      style={E1}
      className="h-10 w-10 items-center justify-center rounded-full bg-surface active:opacity-80 dark:bg-surface-night">
      <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{close ? 'X' : '<'}</Text>
    </Pressable>
  );
}
