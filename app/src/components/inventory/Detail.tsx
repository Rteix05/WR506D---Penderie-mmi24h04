import type { ReactNode } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import type { ClothKind } from '@/components/home/ClothVisual';
import { PhotoArea } from '@/components/inventory/PossessionCard';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { E1 } from '@/components/ui/elevation';

/** Une action de la maquette qui attend sa route d'API (prêt, vente, partage, déplacement). */
export function soon(what: string) {
  Alert.alert(what, 'Cette action arrive bientôt.');
}

/**
 * Photo en tête de fiche (Figma « Detail/Hero photo ») : pleine largeur,
 * fond encre 4 %, bouton retour (ou « X ») en haut à gauche, à 20 du bord.
 */
export function DetailHero({ photo, art, height, scale, close = false }: { photo?: string; art: ClothKind; height: number; scale: number; close?: boolean }) {
  return (
    <View>
      <PhotoArea photo={photo} art={art} scale={scale} height={height} />
      <View className="absolute left-5 top-5">
        <BackButton close={close} />
      </View>
    </View>
  );
}

/** Titre de fiche : nom en Typolio h4 capitales, méta Luciole 12, pastille de statut teintée à droite. */
export function DetailTitle({ name, meta, status }: { name: string; meta: string; status: { label: string; tint: string; text: string } }) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-5">
      <View className="flex-1 gap-0.5">
        <Heading level="h4" accessibilityRole="header" className="uppercase text-ink dark:text-ink-night">
          {name}
        </Heading>
        {meta !== '' && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{meta}</Text>}
      </View>
      <View className={`rounded-full px-2 py-1 ${status.tint}`}>
        <Text className={`font-luciole-bold text-legend ${status.text}`}>{status.label}</Text>
      </View>
    </View>
  );
}

/** Puces d'attributs d'un vêtement (Figma « Garment/Attribute ») : blanches, 32 de haut, Luciole Bold 12 encre. */
export function Attributes({ values }: { values: string[] }) {
  if (values.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-2 px-5">
      {values.map((value) => (
        <View key={value} style={E1} className="h-8 justify-center rounded-full bg-surface px-3 dark:bg-surface-night">
          <Text className="font-luciole-bold text-legend text-ink dark:text-ink-night">{value}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Bloc de fiche (Figma « Card/Section ») : blanc, rayon 16, padding 16,
 * titre Luciole Bold 12 gris, contenu, et un lien rose facultatif.
 */
export function Section({ title, children, link, gap = 'gap-2' }: { title: string; children: ReactNode; link?: { label: string; onPress: () => void }; gap?: 'gap-2' | 'gap-3' }) {
  return (
    <View style={E1} className={`${gap} rounded-md bg-surface p-4 dark:bg-surface-night`}>
      <Text accessibilityRole="header" className="font-luciole-bold text-legend text-muted dark:text-muted-night">
        {title}
      </Text>
      {children}
      {link && (
        <Pressable accessibilityRole="link" onPress={link.onPress} hitSlop={8} className="self-start">
          <Text className="font-luciole text-legend text-primary dark:text-primary-night">{link.label} ›</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Ligne libellé / valeur d'un bloc « Détails » (Figma « Detail/Info row »). */
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="font-luciole text-legend text-muted dark:text-muted-night">{label}</Text>
      <Text className="flex-shrink text-right font-luciole-bold text-body text-ink dark:text-ink-night">{value}</Text>
    </View>
  );
}

/**
 * Barre d'actions d'une fiche (Figma « Detail/Action bar ») : « Prêter » en
 * aplat, trois boutons secondaires côte à côte, le lien rouge de suppression.
 */
export function DetailActions({ secondary, deleteLabel, onDelete, deleting }: { secondary: { label: string; onPress: () => void }[]; deleteLabel?: string; onDelete?: () => void; deleting?: boolean }) {
  return (
    <View className="gap-3 px-5">
      <Button label="Prêter" onPress={() => soon('Prêter')} />
      <View className="flex-row gap-3">
        {secondary.map((action) => (
          <View key={action.label} className="flex-1">
            <Button label={action.label} variant="secondary" onPress={action.onPress} />
          </View>
        ))}
      </View>
      {deleteLabel && onDelete && (
        <Pressable accessibilityRole="button" onPress={onDelete} disabled={deleting} hitSlop={8} className="self-center py-1">
          <Text className={`font-luciole-bold text-legend text-error dark:text-error-night ${deleting ? 'opacity-50' : ''}`}>{deleting ? 'Suppression…' : deleteLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Demande confirmation avant de supprimer (action irréversible pour l'utilisateur). */
export function confirmDelete(what: string, name: string, onConfirm: () => void) {
  Alert.alert(`Supprimer ${what} ?`, `« ${name} » disparaîtra de ton inventaire.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: onConfirm },
  ]);
}
