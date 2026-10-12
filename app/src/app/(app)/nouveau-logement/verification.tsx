import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { InfoCard } from '@/components/ui/InfoCard';
import { usePlaceDraft } from '@/lib/place-draft';
import { createPlace, plural } from '@/lib/places';
import { useLocations } from '@/lib/reference';

/**
 * Étape 4 « Vérifie ton logement » (Figma « Logement — Ajout ·
 * Vérification », 135:2512) : le logement, ses pièces, « Ajouter ce
 * logement » et « Modifier ». Une fois créé, on arrive sur sa vue.
 */
export default function PlaceReviewStep() {
  const { draft, roomsToCreate } = usePlaceDraft();
  const locations = useLocations();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { place, failedRooms } = await createPlace(
        queryClient,
        { name: draft.name.trim(), type: draft.kind.type, address: draft.address.trim(), primary: draft.primary ?? false, rooms: roomsToCreate },
        locations.data?.places ?? [],
      );
      // On ferme le parcours, puis on ouvre le nouveau logement dans l'onglet Logements.
      router.dismissTo('/logements');
      router.push({ pathname: '/logements/[id]', params: { id: place.id } });
      if (failedRooms.length > 0) {
        Alert.alert('Logement ajouté', `Ces pièces n'ont pas pu être créées : ${failedRooms.join(', ')}. Ajoute-les depuis le logement.`);
      }
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };

  return (
    <FlowScreen>
      <StepHeader title="Vérifie ton logement" step={4} />

      <InfoCard
        title="Le logement"
        rows={[
          ['Nom', draft.name.trim()],
          ['Type', draft.kind.label],
          ['Adresse', draft.address.trim()],
          ['Principal', draft.primary ? 'Oui' : 'Non'],
        ]}
      />

      <View style={E1} className="mx-5 gap-2 rounded-md bg-surface p-4 dark:bg-surface-night">
        <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{plural(roomsToCreate.length, 'pièce', 'pièces')}</Text>
        <Text className="font-luciole text-body text-ink dark:text-ink-night">
          {roomsToCreate.length > 0 ? roomsToCreate.map((r) => r.name).join(' · ') : 'Aucune pour l’instant : tu les ajouteras depuis le logement.'}
        </Text>
      </View>

      <ActionBar>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label="Ajouter ce logement" onPress={save} loading={saving} />
        <Button label="Modifier" variant="secondary" onPress={() => router.back()} disabled={saving} />
      </ActionBar>
    </FlowScreen>
  );
}
