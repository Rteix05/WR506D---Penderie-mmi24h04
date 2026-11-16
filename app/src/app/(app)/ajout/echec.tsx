import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { StepHeader } from '@/components/add/StepHeader';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { useDraft } from '@/lib/add-draft';

/**
 * « Pas reconnu » (Figma « Objet — Scan · Échec », node 227:35008) : le
 * scan n'a rien trouvé (ou l'IA n'a pas répondu). Réessayer ramène au
 * viseur ; Ajouter manuellement garde la photo.
 */
export default function FailScreen() {
  const { t } = useTranslation('add');
  const { draft, reset } = useDraft();

  return (
    <FlowScreen>
      <StepHeader
        close
        onClose={closeFlow}
        banner={<Banner tone="error" title={t('failure.bannerTitle')} text={t('failure.bannerText')} />}
        title={t('failure.title')}
        legend={t('failure.legend')}
      />
      <PhotoZone photo={draft.photo} art="pantalon" />

      <InfoCard
        title={t('failure.better')}
        rows={[
          [t('failure.light'), t('failure.lightValue')],
          [t('failure.framing'), t('failure.framingValue')],
          [t('failure.label'), t('failure.labelValue')],
        ]}
      />

      <ActionBar note={t('failure.note')}>
        <Button label={t('failure.retry')} onPress={() => router.back()} />
        <Button
          label={t('failure.manual')}
          variant="secondary"
          onPress={() => {
            reset('item', true);
            router.replace('/ajout/objet/infos');
          }}
        />
      </ActionBar>
    </FlowScreen>
  );
}
