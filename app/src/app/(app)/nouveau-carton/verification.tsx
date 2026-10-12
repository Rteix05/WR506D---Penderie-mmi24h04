import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { locationPath } from '@/lib/add-draft';
import { useBoxDraft } from '@/lib/box-draft';
import { BOX_TYPES, createBox, labelOf } from '@/lib/places';

/**
 * Étape 3 « Vérifie ton carton » (Figma « Rangement — Création ·
 * Vérification », 172:24589) : étiquette, type, code, emplacement, puis
 * « Créer ce carton ». Au lieu de l'écran de confirmation (172:24693), on
 * arrive directement sur la fiche du carton créé.
 */
export default function BoxReviewStep() {
  const { draft } = useBoxDraft();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft.location.room) return;
    setSaving(true);
    setError(null);
    try {
      const box = await createBox(queryClient, {
        name: draft.name.trim(),
        type: draft.type,
        reference: draft.reference.trim(),
        room: draft.location.room.iri,
        storage: draft.location.storage?.iri ?? null,
      });
      router.dismissTo('/logements/cartons');
      router.push({ pathname: '/carton/[id]', params: { id: box.id } });
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };

  return (
    <FlowScreen>
      <StepHeader title="Vérifie ton carton" step={3} total={3} />

      <InfoCard
        title="Le carton"
        rows={[
          ['Étiquette', draft.name.trim()],
          ['Type', labelOf(BOX_TYPES, draft.type)],
          ['Code', draft.reference.trim()],
          ['Emplacement', locationPath({ ...draft.location, place: null })],
        ]}
      />

      <ActionBar>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label="Créer ce carton" onPress={save} loading={saving} />
        <Button label="Modifier" variant="secondary" onPress={() => router.back()} disabled={saving} />
      </ActionBar>
    </FlowScreen>
  );
}
