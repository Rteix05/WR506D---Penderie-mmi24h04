import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { InfoCard, PathCard } from '@/components/ui/InfoCard';
import { CONDITIONS, locationPath, USAGES, useDraft } from '@/lib/add-draft';

/**
 * « Vérifie ton vêtement », étape 4 sur 4 (Figma « Vêtement — Ajout ·
 * Vérification », 135:3108) : les puces de résumé (taille, couleur, usage,
 * état), puis le vêtement, sa localisation et ce qui se passe à l'ajout.
 * « Ajouter » crée le vêtement (POST /api/garments), privé par défaut.
 */
export default function GarmentReviewScreen() {
  const { draft, submit } = useDraft();
  const save = useMutation({ mutationFn: submit, onSuccess: () => router.replace('/ajout/vetement/confirmation') });
  const tags = [
    draft.size && `Taille ${draft.size.name}`,
    draft.color?.name,
    USAGES.find((u) => u.value === draft.usage)?.label,
    ...draft.styles.map((s) => s.name),
    CONDITIONS.find((c) => c.value === draft.condition)?.label,
  ].filter((t): t is string => Boolean(t));

  return (
    <FlowScreen>
      <StepHeader step={4} title="Vérifie ton vêtement" />
      <PhotoZone photo={draft.photo} art={draft.garmentType?.art ?? 'tshirt'} />

      <View className="flex-row flex-wrap gap-2 px-5">
        {tags.map((tag) => (
          <View key={tag} style={E1} className="h-8 items-center justify-center rounded-full bg-surface px-3 dark:bg-surface-night">
            <Text className="font-luciole-bold text-legend text-ink dark:text-ink-night">{tag}</Text>
          </View>
        ))}
      </View>

      <InfoCard
        title="Le vêtement"
        rows={[
          ['Nom', draft.name.trim()],
          ['Marque', draft.brand?.name],
          ['Catégorie', draft.category?.name],
        ]}
      />
      <PathCard title="Localisation" path={locationPath(draft.location)} />
      <InfoCard
        title="À l'ajout"
        rows={[
          ['Statut', 'Dans ma penderie'],
          ['Visible par', 'Toi seul'],
        ]}
      />

      <ActionBar>
        {save.isError && (
          <Text accessibilityRole="alert" className="font-luciole text-body text-error dark:text-error-night">
            {save.error.message}
          </Text>
        )}
        <Button label="Ajouter" onPress={() => save.mutate()} loading={save.isPending} />
        <Button label="Modifier" variant="secondary" onPress={() => router.dismissTo('/ajout/vetement/infos')} disabled={save.isPending} />
      </ActionBar>
    </FlowScreen>
  );
}
