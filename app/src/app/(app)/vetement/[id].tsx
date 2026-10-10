import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Attributes, confirmDelete, DetailActions, DetailHero, DetailTitle, Section, soon } from '@/components/inventory/Detail';
import { BackButton } from '@/components/ui/BackButton';
import { artOf, AVAILABILITY, CONDITION_LABEL, deletePossession, locationOf, rootCategory, usePossession, USAGE_LABEL } from '@/lib/possessions';
import { useBrands, useColors, useGarmentCategories, useLocations, useSizes, useStyles } from '@/lib/reference';

/**
 * Fiche d'un vêtement (Figma « Vêtement — Fiche », 135:3406) : photo, nom,
 * « Marque · Catégorie · Taille », statut, puces d'attributs (taille,
 * couleurs, usage, état, styles), emplacement, actions.
 *
 * En attente de routes d'API : l'historique de port (bloc absent),
 * « Déplacer », « Prêter », « Vendre » (une alerte le dit).
 */
export default function GarmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const garment = usePossession('garment', id);
  const categories = useGarmentCategories();
  const brands = useBrands();
  const colors = useColors();
  const styles = useStyles();
  const sizes = useSizes();
  const locations = useLocations();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  if (!garment.data) {
    return (
      <SafeAreaView className="flex-1 gap-6 bg-bg px-5 pt-5 dark:bg-bg-night">
        <BackButton />
        {garment.isError ? <Text className="font-luciole text-body text-error dark:text-error-night">{garment.error.message}</Text> : <ActivityIndicator />}
      </SafeAreaView>
    );
  }

  const p = garment.data;
  const owner = p.access === 'ADMIN';
  const find = (list: { iri: string; name: string }[] | undefined, iri: string | null | undefined) => (iri ? (list?.find((r) => r.iri === iri)?.name ?? null) : null);
  const size = find([...(sizes.data?.values() ?? [])].flat(), p.size) ?? p.sizeLabel ?? null;
  const category = find(categories.data, p.category);
  const root = rootCategory(categories.data, p.category);
  const where = locationOf(locations.data, p);
  // Pour un vêtement disponible, la maquette dit « Dans ma penderie ».
  const status = p.availability === 'AVAILABLE' ? { ...AVAILABILITY.AVAILABLE, label: 'Dans ma penderie' } : AVAILABILITY[p.availability];
  const attributes = [
    size && `Taille ${size}`,
    ...(p.colors ?? []).map((c) => find(colors.data, c)),
    p.usage && USAGE_LABEL[p.usage],
    p.condition && CONDITION_LABEL[p.condition],
    ...(p.styles ?? []).map((s) => find(styles.data, s)),
  ].filter((v): v is string => Boolean(v));

  const edit = () => router.push({ pathname: '/modifier', params: { kind: 'garment', id: p.id } });
  const remove = () =>
    confirmDelete('ce vêtement', p.name, async () => {
      setDeleting(true);
      try {
        await deletePossession(queryClient, 'garment', p.id);
        router.back();
      } catch (e) {
        setDeleting(false);
        Alert.alert('Suppression impossible', e instanceof Error ? e.message : '');
      }
    });

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-10">
        <SafeAreaView edges={['top']} className="bg-ink/[0.04] dark:bg-ink-night/[0.06]">
          <DetailHero photo={p.photos?.[0]} art={artOf('garment', p, categories.data)} height={320} scale={200 / 44.1} />
        </SafeAreaView>
        <DetailTitle name={p.name} meta={[find(brands.data, p.brand), root?.name ?? category, size].filter(Boolean).join(' · ')} status={status} />
        <Attributes values={attributes} />

        <View className="gap-3 px-5">
          {p.room && (
            <Section title="Localisation" link={owner ? { label: 'Déplacer le vêtement', onPress: () => soon('Déplacer le vêtement') } : undefined}>
              <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{where ?? '…'}</Text>
            </Section>
          )}
          {p.description && (
            <Section title="Description">
              <Text className="font-luciole text-body text-ink dark:text-ink-night">{p.description}</Text>
            </Section>
          )}
          {owner && p.notes && (
            <Section title="Notes" link={{ label: 'Modifier la note', onPress: edit }}>
              <Text className="font-luciole text-body text-ink dark:text-ink-night">{p.notes}</Text>
            </Section>
          )}
        </View>

        {owner && (
          <DetailActions
            secondary={[
              { label: 'Modifier', onPress: edit },
              { label: 'Déplacer', onPress: () => soon('Déplacer') },
              { label: 'Vendre', onPress: () => soon('Vendre') },
            ]}
            deleteLabel="Supprimer ce vêtement"
            onDelete={remove}
            deleting={deleting}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
