import { router } from 'expo-router';
import { useState } from 'react';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Grid, TileCard } from '@/components/places/Blocks';
import { Button } from '@/components/ui/Button';
import { usePlaceDraft } from '@/lib/place-draft';
import { PLACE_KINDS } from '@/lib/places';

/**
 * Étape 1 « C'est quoi ? » (Figma « Logement — Ajout · Type », 135:2402) :
 * six cartes à initiale ; celle choisie a sa pastille rose.
 */
export default function PlaceTypeStep() {
  const { draft, chooseKind } = usePlaceDraft();
  const [chosen, setChosen] = useState(draft.kind.key);

  const next = () => {
    chooseKind(PLACE_KINDS.find((k) => k.key === chosen) ?? PLACE_KINDS[0]);
    router.push('/nouveau-logement/infos');
  };

  return (
    <FlowScreen>
      <StepHeader title="C'est quoi ?" step={1} close />
      <Grid
        items={PLACE_KINDS}
        keyOf={(k) => k.key}
        render={(kind) => <TileCard testID={`place-kind-${kind.key}`} title={kind.label} meta={kind.description} accent={kind.key === chosen} selected={kind.key === chosen} onPress={() => setChosen(kind.key)} />}
      />
      <ActionBar note="Le type sert juste à te proposer les bonnes pièces ensuite.">
        <Button label="Continuer" onPress={next} testID="place-type-next" />
      </ActionBar>
    </FlowScreen>
  );
}
