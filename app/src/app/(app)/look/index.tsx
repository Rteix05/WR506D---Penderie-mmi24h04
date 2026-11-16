import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('social');
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
      setError(e instanceof Error ? e.message : t('today.error'));
    }
  };

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title={t('today.title')} legend={t('today.legend')} />
      </View>

      {today.isPending ? (
        <ActivityIndicator className="py-10" />
      ) : (
        <InfoCard
          title={t('today.howTitle')}
          rows={[
            [t('today.howPhotoTitle'), t('today.howPhotoBody')],
            [t('today.howTagsTitle'), t('today.howTagsBody')],
            [t('today.howRecognitionTitle'), t('today.howRecognitionBody')],
            [t('today.howPostTitle'), t('today.howPostBody')],
          ]}
        />
      )}

      <ActionBar note={t('today.note')}>
        {(error || today.isError) && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error ?? today.error?.message}
          </Text>
        )}
        <Button glyph="[ ]" label={t('today.takePhoto')} onPress={() => start('camera')} loading={busy === 'camera'} disabled={busy !== null || today.isPending} />
        <Button label={t('today.chooseGallery')} variant="secondary" onPress={() => start('library')} loading={busy === 'library'} disabled={busy !== null || today.isPending} />
      </ActionBar>
    </FlowScreen>
  );
}
