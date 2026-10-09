import { router } from 'expo-router';
import { useCallback } from 'react';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { LocationStep } from '@/components/add/LocationStep';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { useDraft, type Location } from '@/lib/add-draft';

/** « Où tu le ranges ? », étape 3 sur 4 (Figma « Vêtement — Ajout · Localisation », 135:3064). */
export default function GarmentLocationScreen() {
  const { draft, update } = useDraft();
  const onChange = useCallback((location: Location) => update({ location }), [update]);

  return (
    <FlowScreen>
      <StepHeader step={3} title="Où tu le ranges ?" />
      <LocationStep kind="garment" location={draft.location} onChange={onChange} />
      <ActionBar>
        <Button label="Continuer" disabled={!draft.location.room} onPress={() => router.push('/ajout/vetement/verification')} />
      </ActionBar>
    </FlowScreen>
  );
}
