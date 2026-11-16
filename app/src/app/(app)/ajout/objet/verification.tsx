import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { InfoCard, PathCard } from '@/components/ui/InfoCard';
import { CONDITIONS, locationPath, useDraft } from '@/lib/add-draft';

/**
 * « Vérifie ton objet », étape 3 sur 4 (Figma « Objet — Vérification »,
 * 135:2070). « Ajouter cet objet » crée l'objet (POST /api/items) ; il est
 * privé par défaut : « Visible par toi seul ».
 */
export default function ItemReviewScreen() {
  const { t } = useTranslation('add');
  const { draft, submit } = useDraft();
  const save = useMutation({ mutationFn: submit, onSuccess: () => router.replace('/ajout/objet/confirmation') });

  return (
    <FlowScreen>
      <StepHeader step={3} title={t('itemReview.title')} />
      <PhotoZone photo={draft.photo} art="pantalon" />
      <InfoCard
        title={t('itemReview.object')}
        rows={[
          [t('itemReview.name'), draft.name.trim()],
          [t('itemReview.description'), draft.description.trim()],
          [t('itemReview.category'), draft.category?.name],
          [t('itemReview.condition'), CONDITIONS.find((c) => c.value === draft.condition)?.label],
        ]}
      />
      <PathCard title={t('itemReview.location')} path={locationPath(draft.location)} />
      <InfoCard
        title={t('itemReview.onAdd')}
        rows={[
          [t('itemReview.status'), t('itemReview.available')],
          [t('itemReview.visibleBy'), t('itemReview.onlyYou')],
        ]}
      />
      <ActionBar>
        {save.isError && (
          <Text accessibilityRole="alert" className="font-luciole text-body text-error dark:text-error-night">
            {save.error.message}
          </Text>
        )}
        <Button label={t('itemReview.submit')} onPress={() => save.mutate()} loading={save.isPending} />
        <Button label={t('itemReview.edit')} variant="secondary" onPress={() => router.dismissTo('/ajout/objet/infos')} disabled={save.isPending} />
      </ActionBar>
    </FlowScreen>
  );
}
