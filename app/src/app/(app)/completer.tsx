import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { LocationStep } from '@/components/add/LocationStep';
import { SelectField } from '@/components/form/SelectField';
import { BackButton } from '@/components/ui/BackButton';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import type { Location } from '@/lib/add-draft';
import { completeGarment, usePossession } from '@/lib/possessions';
import { useGarmentCategories } from '@/lib/reference';

/**
 * Terminer un vêtement « à compléter » (ajouté d'un simple titre depuis le
 * look du jour) : sa catégorie, puis où il est rangé, avec la même cascade
 * Logement › Pièce › Rangement › Conteneur que le parcours d'ajout. La
 * taille, les couleurs ou la marque s'ajoutent ensuite par « Modifier ».
 */
export default function CompleteGarmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const garment = usePossession('garment', id);
  const categories = useGarmentCategories();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<Location>({ place: null, room: null, storage: null, box: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = async (thenEdit: boolean) => {
    if (!category || !location.room) return;
    setSaving(true);
    setError(null);
    try {
      await completeGarment(queryClient, id, {
        category,
        room: location.room.iri,
        ...(location.storage ? { storage: location.storage.iri } : {}),
        ...(location.box ? { box: location.box.iri } : {}),
      });
      if (thenEdit) {
        router.replace({ pathname: '/modifier', params: { kind: 'garment', id } });
      } else {
        router.back();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le vêtement n'a pas pu être complété.");
      setSaving(false);
    }
  };

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton close />
      </View>
      <View className="px-5">
        <ScreenTitle title="Compléter" legend={garment.data?.name} />
      </View>
      {garment.isPending && <ActivityIndicator className="py-10" />}
      {garment.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{garment.error.message}</Text>}
      {garment.data && !garment.data.incomplete && (
        <View className="px-5">
          <Banner tone="success" title="Déjà complet" text="Ce vêtement a sa catégorie et son emplacement." />
        </View>
      )}
      {garment.data?.incomplete && (
        <>
          <View className="px-5">
            <Banner tone="info" title="Ajouté depuis ton look" text="Donne-lui une catégorie et range-le : il rejoindra tes logements et les suggestions de tenues." />
          </View>
          <View className="px-5">
            <SelectField
              label="Catégorie"
              value={categories.data?.find((c) => c.iri === category)?.name ?? null}
              loading={categories.isPending}
              options={(categories.data ?? []).map((c) => ({ key: c.iri, label: c.name }))}
              onSelect={setCategory}
            />
          </View>
          <LocationStep kind="garment" location={location} onChange={setLocation} />
          <ActionBar note={!category || !location.room ? 'Choisis une catégorie et au moins une pièce.' : undefined}>
            {error && (
              <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
                {error}
              </Text>
            )}
            <Button label="Terminer" onPress={() => done(false)} disabled={!category || !location.room} loading={saving} />
            <Button label="Terminer et ajouter les détails" variant="secondary" onPress={() => done(true)} disabled={!category || !location.room || saving} />
          </ActionBar>
        </>
      )}
    </FlowScreen>
  );
}
