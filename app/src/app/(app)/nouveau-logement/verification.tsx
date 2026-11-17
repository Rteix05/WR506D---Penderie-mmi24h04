import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { InfoCard } from '@/components/ui/InfoCard';
import { usePlaceDraft } from '@/lib/place-draft';
import { createPlace } from '@/lib/places';
import { useLocations } from '@/lib/reference';

/**
 * Étape 4 « Vérifie ton logement » (Figma « Logement — Ajout ·
 * Vérification », 135:2512) : le logement, ses pièces, « Ajouter ce
 * logement » et « Modifier ». Une fois créé, on arrive sur sa vue.
 */
export default function PlaceReviewStep() {
  const { t } = useTranslation('places');
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
        Alert.alert(t('newPlace.verification.failedTitle'), t('newPlace.verification.failedRooms', { rooms: failedRooms.join(', ') }));
      }
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : t('actions.saveError'));
    }
  };

  return (
    <FlowScreen>
      <StepHeader title={t('newPlace.verification.title')} step={4} />

      <InfoCard
        title={t('newPlace.verification.cardTitle')}
        rows={[
          [t('newPlace.verification.name'), draft.name.trim()],
          [t('newPlace.verification.type'), draft.kind.label],
          [t('newPlace.verification.address'), draft.address.trim()],
          [t('newPlace.verification.primary'), draft.primary ? t('newPlace.yes') : t('newPlace.no')],
        ]}
      />

      <View style={E1} className="mx-5 gap-2 rounded-md bg-surface p-4 dark:bg-surface-night">
        <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{t('counts.rooms', { count: roomsToCreate.length })}</Text>
        <Text className="font-luciole text-body text-ink dark:text-ink-night">
          {roomsToCreate.length > 0 ? roomsToCreate.map((r) => r.name).join(' · ') : t('newPlace.verification.noRooms')}
        </Text>
      </View>

      <ActionBar>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label={t('newPlace.verification.add')} onPress={save} loading={saving} />
        <Button label={t('actions.modify')} variant="secondary" onPress={() => router.back()} disabled={saving} />
      </ActionBar>
    </FlowScreen>
  );
}
