import type { ReactNode } from 'react';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/BackButton';
import { ScreenTitle } from '@/components/ui/ScreenTitle';

type Props = {
  title: string;
  legend?: string;
  /** Étape 1 à 4 : affiche la jauge (Figma « Jauge ») et « Étape N sur 4 ». */
  step?: number;
  /** « X » au lieu de « < » : premier écran du parcours, qui le ferme. */
  close?: boolean;
  onClose?: () => void;
  /** Bloc entre la barre haute et le titre (bandeau « Objet ajouté ! », « Impossible d'identifier… »). */
  banner?: ReactNode;
};

/**
 * En-tête des écrans d'ajout (Figma, parcours objet et vêtement) : barre
 * haute de 44 avec le bouton rond, la jauge de 4 segments (4 px, rose
 * pour les étapes faites, encre 10 % sinon), puis le titre de page.
 */
export function StepHeader({ title, legend, step, close = false, onClose, banner }: Props) {
  return (
    <View className="gap-6">
      <View className="h-11 flex-row items-center px-5">
        <BackButton close={close} onPress={onClose} />
      </View>
      {banner}
      {step !== undefined && (
        <View accessible accessibilityLabel={`Étape ${step} sur 4`} className="flex-row gap-1 px-5">
          {[1, 2, 3, 4].map((n) => (
            <View key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-ink/10 dark:bg-ink-night/15'}`} />
          ))}
        </View>
      )}
      <View className="px-5">
        <ScreenTitle title={title} legend={legend ?? (step !== undefined ? `Étape ${step} sur 4` : undefined)} />
      </View>
    </View>
  );
}
