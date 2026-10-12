import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { ApiError } from '@/lib/api';
import { createLook, useTodayLook } from '@/lib/look';
import { pickPhoto } from '@/lib/photo';

/**
 * Look du jour, point d'entrée : s'il existe déjà aujourd'hui, on le
 * reprend ; sinon on prend la photo (ou on la choisit dans la galerie).
 *
 * Pas d'écran Figma pour cette fonctionnalité : l'écran reprend les blocs
 * du parcours d'ajout (titre, carte d'explication, barre d'actions).
 */
export default function TodayLookScreen() {
  const today = useTodayLook();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (today.data) {
    return <Redirect href={{ pathname: '/look/[id]', params: { id: today.data.id } }} />;
  }

  const start = async (source: 'camera' | 'library') => {
    setError(null);
    const asset = await pickPhoto(source);
    if (!asset) return;
    setBusy(source);
    try {
      const look = await createLook(queryClient, asset);
      router.replace({ pathname: '/look/[id]', params: { id: look.id } });
    } catch (e) {
      setBusy(null);
      // Déjà un look aujourd'hui (pris depuis un autre appareil) : on le recharge.
      if (e instanceof ApiError && e.status === 409) {
        await today.refetch();

        return;
      }
      setError(e instanceof Error ? e.message : "La photo n'a pas pu être envoyée.");
    }
  };

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title="Look du jour" legend="Ta tenue d'aujourd'hui, prête pour Instagram" />
      </View>

      {today.isPending ? (
        <ActivityIndicator className="py-10" />
      ) : (
        <InfoCard
          title="Comment ça marche"
          rows={[
            ['1. La photo', 'Prends-toi en photo, en pied'],
            ['2. Les points', 'Touche chaque vêtement porté'],
            ['3. La reconnaissance', "L'IA retrouve le vêtement dans ton dressing, ou te propose de l'ajouter"],
            ['4. Le post', '2 images : ta photo, puis tes vêtements'],
          ]}
        />
      )}

      <ActionBar note="La photo reste privée : toi seul la vois dans Penderie.">
        {(error || today.isError) && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error ?? today.error?.message}
          </Text>
        )}
        <Button glyph="[ ]" label="Prendre ma photo" onPress={() => start('camera')} loading={busy === 'camera'} disabled={busy !== null || today.isPending} />
        <Button label="Choisir dans la galerie" variant="secondary" onPress={() => start('library')} loading={busy === 'library'} disabled={busy !== null || today.isPending} />
      </ActionBar>
    </FlowScreen>
  );
}
