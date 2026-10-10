import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
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
  const { draft, submit } = useDraft();
  const save = useMutation({ mutationFn: submit, onSuccess: () => router.replace('/ajout/objet/confirmation') });

  return (
    <FlowScreen>
      <StepHeader step={3} title="Vérifie ton objet" />
      <PhotoZone photo={draft.photo} art="pantalon" />
      <InfoCard
        title="L'objet"
        rows={[
          ['Nom', draft.name.trim()],
          ['Description', draft.description.trim()],
          ['Catégorie', draft.category?.name],
          ['État', CONDITIONS.find((c) => c.value === draft.condition)?.label],
        ]}
      />
      <PathCard title="Localisation" path={locationPath(draft.location)} />
      <InfoCard
        title="À l'ajout"
        rows={[
          ['Statut', 'Disponible'],
          ['Visible par', 'Toi seul'],
        ]}
      />
      <ActionBar>
        {save.isError && (
          <Text accessibilityRole="alert" className="font-luciole text-body text-error dark:text-error-night">
            {save.error.message}
          </Text>
        )}
        <Button label="Ajouter cet objet" onPress={() => save.mutate()} loading={save.isPending} />
        <Button label="Modifier" variant="secondary" onPress={() => router.dismissTo('/ajout/objet/infos')} disabled={save.isPending} />
      </ActionBar>
    </FlowScreen>
  );
}
