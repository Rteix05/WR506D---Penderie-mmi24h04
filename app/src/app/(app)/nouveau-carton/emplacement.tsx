import { router } from 'expo-router';
import { useCallback } from 'react';

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
  const { draft, update } = useBoxDraft();
  const onChange = useCallback((location: Location) => update({ location }), [update]);

  return (
    <FlowScreen>
      <StepHeader title="Où tu le poses ?" step={2} total={3} />
      <LocationStep kind="box" location={draft.location} onChange={onChange} />
      <ActionBar note="Sans rangement, le carton est posé dans la pièce.">
        <Button label="Continuer" disabled={!draft.location.room} onPress={() => router.push('/nouveau-carton/verification')} />
      </ActionBar>
    </FlowScreen>
  );
}
