import { router } from 'expo-router';
import { useCallback } from 'react';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { LocationStep } from '@/components/add/LocationStep';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { useDraft, type Location } from '@/lib/add-draft';

/** « Où tu le ranges ? », étape 2 sur 4 (Figma « Objet — Localisation », 135:2035). */
export default function ItemLocationScreen() {
  const { draft, update } = useDraft();
  const onChange = useCallback((location: Location) => update({ location }), [update]);

  return (
    <FlowScreen>
      <StepHeader step={2} title="Où tu le ranges ?" />
      <LocationStep kind="item" location={draft.location} onChange={onChange} />
      <ActionBar note="Tu pourras déplacer l'objet à tout moment.">
        <Button label="Continuer" disabled={!draft.location.room} onPress={() => router.push('/ajout/objet/verification')} />
      </ActionBar>
    </FlowScreen>
  );
}
