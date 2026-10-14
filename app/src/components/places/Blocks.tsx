import { router } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { PhotoArea } from '@/components/inventory/PossessionCard';
import { E1 } from '@/components/ui/elevation';
import { useItemCategories, useGarmentCategories } from '@/lib/reference';
import { artOf, AVAILABILITY } from '@/lib/possessions';
import type { Stored } from '@/lib/places';

/**
 * Briques des écrans Logements (Figma, section « 04 · Logements &
 * rangements ») : cartes de grille à initiale, lignes de liste, fil
 * d'Ariane, en-têtes de section, ligne d'objet.
 */

/** Pastille à initiale (Figma « Illustration ») : 48, rayon 12 ; rose 12 % pour la première carte, encre 5 % sinon. */
export function Initial({ name, accent }: { name: string; accent: boolean }) {
  return (
    <View accessible={false} className={`h-12 w-12 items-center justify-center rounded-sm ${accent ? 'bg-primary/[0.12]' : 'bg-ink/[0.05] dark:bg-ink-night/[0.08]'}`}>
      <Text className={`font-luciole-bold text-body ${accent ? 'text-primary dark:text-primary-night' : 'text-muted dark:text-muted-night'}`}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/**
 * Carte de grille (Figma « Card/Place ») : blanche, rayon 16, ombre e-1,
 * padding 12 ; pastille en haut, puis nom Luciole Bold 16 et méta 12.
 * aside : texte en haut à droite (« 12 objets » des cartons). selected :
 * carte d'un choix (type de logement), annoncée comme choisie.
 */
export function TileCard({
  title,
  meta,
  accent,
  onPress,
  glyph,
  aside,
  selected,
}: {
  title: string;
  meta: string;
  accent: boolean;
  onPress: () => void;
  glyph?: ReactNode;
  aside?: string;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      aria-selected={selected}
      accessibilityLabel={[title, aside, meta].filter(Boolean).join(', ')}
      onPress={onPress}
      style={E1}
      className="flex-1 gap-3 rounded-md bg-surface p-3 active:opacity-80 dark:bg-surface-night">
      <View className="flex-row items-start justify-between">
        {glyph ?? <Initial name={title} accent={accent} />}
        {aside && <Text className="pt-1 font-luciole-bold text-legend text-muted dark:text-muted-night">{aside}</Text>}
      </View>
      <View className="gap-0.5">
        <Text className="font-luciole-bold text-body leading-5 text-ink dark:text-ink-night">{title}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{meta}</Text>
      </View>
    </Pressable>
  );
}

/** Grille à deux colonnes de 12 d'écart ; une case vide complète la dernière ligne. */
export function Grid<T>({ items, render, keyOf }: { items: T[]; render: (item: T, index: number) => ReactNode; keyOf: (item: T) => string }) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View className="gap-3 px-5">
      {rows.map((row, r) => (
        <View key={keyOf(row[0])} className="flex-row items-start gap-3">
          {row.map((item, c) => (
            <Fragment key={keyOf(item)}>{render(item, r * 2 + c)}</Fragment>
          ))}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}

/**
 * Ligne de liste (Figma « List/Row ») : blanche, rayon 16, ombre e-1,
 * titre Luciole Bold 16, sous-titre 12, chevron « › » — ou un lien rose
 * à droite (« Ouvrir le carton › »).
 */
export function RowCard({ title, subtitle, onPress, link }: { title: string; subtitle?: string; onPress: () => void; link?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, link].filter(Boolean).join(', ')}
      onPress={onPress}
      style={E1}
      className="mx-5 flex-row items-center justify-between gap-3 rounded-md bg-surface px-4 py-3 active:opacity-80 dark:bg-surface-night">
      <View className="flex-1 gap-0.5">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{title}</Text>
        {subtitle ? <Text className="font-luciole text-legend text-muted dark:text-muted-night">{subtitle}</Text> : null}
      </View>
      {link ? (
        <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">{link} ›</Text>
      ) : (
        <Text className="font-luciole-bold text-body text-muted/[0.85] dark:text-muted-night">›</Text>
      )}
    </Pressable>
  );
}

/** En-tête de section (Figma « Entete ») : titre Luciole Bold 16, à droite un compte rose ou un lien. */
export function SectionHeader({ title, aside, onAside }: { title: string; aside?: string; onAside?: () => void }) {
  return (
    <View className="flex-row items-center justify-between px-5">
      <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
        {title}
      </Text>
      {aside &&
        (onAside ? (
          <Pressable accessibilityRole="link" onPress={onAside} hitSlop={8}>
            <Text className="font-luciole text-legend text-primary dark:text-primary-night">{aside}</Text>
          </Pressable>
        ) : (
          <Text className="font-luciole text-legend text-primary dark:text-primary-night">{aside}</Text>
        ))}
    </View>
  );
}

export type Crumb = { label: string; onPress?: () => void };

/**
 * Fil d'Ariane (Figma « Nav/Breadcrumb ») : puces de 32 séparées par « › »,
 * sur plusieurs lignes ; la dernière (où l'on est) en aplat rose, les
 * autres blanches et cliquables.
 */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <View accessibilityRole="summary" accessibilityLabel={`Emplacement : ${crumbs.map((c) => c.label).join(', ')}`} className="flex-row flex-wrap items-center gap-x-2 gap-y-1 px-5">
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;

        return (
          <Fragment key={`${i}-${crumb.label}`}>
            {i > 0 && (
              <Text accessible={false} className="font-luciole-bold text-legend text-muted dark:text-muted-night">
                ›
              </Text>
            )}
            <Pressable
              accessibilityRole={last ? 'text' : 'link'}
              disabled={last || !crumb.onPress}
              onPress={crumb.onPress}
              style={last ? undefined : E1}
              className={`h-8 justify-center rounded-full px-3 ${last ? 'bg-primary' : 'bg-surface active:opacity-80 dark:bg-surface-night'}`}>
              <Text className={`font-luciole-bold text-legend ${last ? 'text-white' : 'text-muted dark:text-muted-night'}`}>{crumb.label}</Text>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

/** Pictogramme de carton (Figma « Mes cartons ») : pastille rose de 48, petit rectangle rose au trait. */
export function BoxGlyph() {
  return (
    <View accessible={false} className="h-12 w-12 items-center justify-center rounded-sm bg-primary/[0.12]">
      <View className="h-4 w-2.5 rounded-[2px] border-2 border-primary dark:border-primary-night" />
    </View>
  );
}

/** Ouvre la fiche d'un objet ou d'un vêtement. */
export function openPossession(p: Stored) {
  router.push({ pathname: p.kind === 'item' ? '/objet/[id]' : '/vetement/[id]', params: { id: p.id } });
}

/**
 * Ligne d'un objet (Figma « Card/Object », liste) : 90 de haut, vignette
 * de 56 (photo ou dessin), nom Luciole Bold 16, méta 12, pastille de
 * statut teintée, chevron.
 */
export function PossessionRow({ possession, meta: given }: { possession: Stored; meta?: string }) {
  const itemCategories = useItemCategories();
  const garmentCategories = useGarmentCategories();
  const categories = possession.kind === 'item' ? itemCategories.data : garmentCategories.data;
  const state = AVAILABILITY[possession.availability];
  const art = artOf(possession.kind, possession, categories);
  // Par défaut, sa catégorie (« Outils », « T-shirts »), comme dans la maquette.
  const meta = given ?? categories?.find((c) => c.iri === possession.category)?.name ?? (possession.kind === 'garment' ? 'Vêtement' : 'Objet');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[possession.name, meta, state.label].filter(Boolean).join(', ')}
      onPress={() => openPossession(possession)}
      style={E1}
      className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-3 active:opacity-80 dark:bg-surface-night">
      <View className="h-14 w-14 overflow-hidden rounded-sm">
        {/* Dessin de 39,2 de large dans Figma (× 0,889 de la taille mosaïque). */}
        <PhotoArea photo={possession.photos?.[0]} art={art} scale={39.2 / 44.1} height={56} />
      </View>
      <View className="flex-1 items-start gap-1">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{possession.name}</Text>
        {meta !== '' && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{meta}</Text>}
        <View className={`rounded-full px-2 py-1 ${state.tint}`}>
          <Text className={`font-luciole-bold text-legend ${state.text}`}>{state.label}</Text>
        </View>
      </View>
      <Text className="font-luciole-bold text-body text-muted/[0.85] dark:text-muted-night">›</Text>
    </Pressable>
  );
}

/** L'emplacement demandé n'existe pas (supprimé, ou plus visible). */
export function Missing({ text }: { text: string }) {
  return <Text className="px-5 font-luciole text-body text-muted dark:text-muted-night">{text}</Text>;
}

/** Écran Logements : chargement, erreur, ou le contenu une fois tout là. */
export function Loading({ error }: { error: Error | null }) {
  return error ? <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{error.message}</Text> : <ActivityIndicator className="pt-8" />;
}
