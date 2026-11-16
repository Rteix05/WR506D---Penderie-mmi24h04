import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { LocationStep } from '@/components/add/LocationStep';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import type { Location } from '@/lib/add-draft';
import { useBoxDraft } from '@/lib/box-draft';

/**
 * Étape 2 « Où tu le poses ? » (Figma « Rangement — Création ·
 * Emplacement », 172:24413) : logement › pièce › rangement, et les
 * endroits où d'autres cartons sont déjà posés.
 *
 * Écart avec la maquette : le rangement est facultatif. L'API accepte un
 * carton posé au sol d'une pièce (garage, cave), sans meuble.
 */
export default function BoxLocationStep() {
  const { t } = useTranslation('places');
  const { draft, update } = useBoxDraft();
  const onChange = useCallback((location: Location) => update({ location }), [update]);

  return (
    <FlowScreen>
      <StepHeader title={t('newBox.emplacement.title')} step={2} total={3} />
      <LocationStep kind="box" location={draft.location} onChange={onChange} />
      <ActionBar note={t('newBox.emplacement.note')}>
        <Button label={t('actions.continue')} disabled={!draft.location.room} onPress={() => router.push('/nouveau-carton/verification')} />
      </ActionBar>
    </FlowScreen>
  );
}
