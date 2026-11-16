import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Grid, TileCard } from '@/components/places/Blocks';
import { Button } from '@/components/ui/Button';
import { usePlaceDraft } from '@/lib/place-draft';
import { placeKinds } from '@/lib/places';

/**
 * Étape 1 « C'est quoi ? » (Figma « Logement — Ajout · Type », 135:2402) :
 * six cartes à initiale ; celle choisie a sa pastille rose.
 */
export default function PlaceTypeStep() {
  const { t } = useTranslation('places');
  const { draft, chooseKind } = usePlaceDraft();
  const [chosen, setChosen] = useState(draft.kind.key);

  const next = () => {
    chooseKind(placeKinds().find((k) => k.key === chosen) ?? placeKinds()[0]);
    router.push('/nouveau-logement/infos');
  };

  return (
    <FlowScreen>
      <StepHeader title={t('newPlace.type.title')} step={1} close />
      <Grid
        items={placeKinds()}
        keyOf={(k) => k.key}
        render={(kind) => <TileCard title={kind.label} meta={kind.description} accent={kind.key === chosen} selected={kind.key === chosen} onPress={() => setChosen(kind.key)} />}
      />
      <ActionBar note={t('newPlace.type.note')}>
        <Button label={t('actions.continue')} onPress={next} />
      </ActionBar>
    </FlowScreen>
  );
}
