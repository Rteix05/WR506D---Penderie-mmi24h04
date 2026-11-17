import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { LocationStep } from '@/components/add/LocationStep';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { useDraft, type Location } from '@/lib/add-draft';

/** « Où tu le ranges ? », étape 2 sur 4 (Figma « Objet — Localisation », 135:2035). */
export default function ItemLocationScreen() {
  const { t } = useTranslation('add');
  const { draft, update } = useDraft();
  const onChange = useCallback((location: Location) => update({ location }), [update]);

  return (
    <FlowScreen>
      <StepHeader step={2} title={t('itemLocation.title')} />
      <LocationStep kind="item" location={draft.location} onChange={onChange} />
      <ActionBar note={t('itemLocation.note')}>
        <Button label={t('itemLocation.continue')} disabled={!draft.location.room} onPress={() => router.push('/ajout/objet/verification')} />
      </ActionBar>
    </FlowScreen>
  );
}
