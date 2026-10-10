import { router } from 'expo-router';

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
  const { draft, reset } = useDraft();

  return (
    <FlowScreen>
      <StepHeader
        close
        onClose={closeFlow}
        banner={<Banner tone="error" title="Impossible d'identifier cet objet" text="Ta photo est gardée pour la suite." />}
        title="Pas reconnu"
        legend="Ça arrive, tu n'es pas bloqué"
      />
      <PhotoZone photo={draft.photo} art="pantalon" />

      <InfoCard
        title="Pour un meilleur résultat"
        rows={[
          ['Lumière', 'Pas de contre-jour'],
          ['Cadrage', "L'objet en entier"],
          ['Étiquette', 'Visible si possible'],
        ]}
      />

      <ActionBar note="En manuel, ta photo est déjà ajoutée : il reste le nom et la catégorie.">
        <Button label="Réessayer" onPress={() => router.back()} />
        <Button
          label="Ajouter manuellement"
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
