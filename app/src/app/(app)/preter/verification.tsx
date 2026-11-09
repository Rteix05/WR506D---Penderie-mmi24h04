import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Section } from '@/components/inventory/Detail';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { useLoanDraft } from '@/lib/loan-draft';
import { dueDateOf, lend, shortDate } from '@/lib/loans';

/**
 * Étape 3 « Vérifie le prêt » (maquette, « Prêt — Vérification ») : l'objet,
 * l'ami, la date de retour, la note, puis « Confirmer le prêt ». On arrive
 * ensuite sur la fiche du prêt, avec le bandeau « Prêt enregistré ! »
 * (maquette, « Prêt — Confirmation »).
 */
export default function LendReviewStep() {
  const { draft } = useLoanDraft();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const due = dueDateOf(draft.due, draft.otherDate);
  const note = draft.note.trim();

  const save = async () => {
    if (!draft.possession || !draft.borrower || due === undefined) return;
    setSaving(true);
    setError(null);
    try {
      const loan = await lend(queryClient, { possession: draft.possession.iri, borrower: draft.borrower.id, dueDate: due, note: note || null });
      // Ferme le parcours (modale), revient à la fiche de l'objet et ouvre le prêt par-dessus.
      const { kind, id } = draft.possession;
      router.dismissTo({ pathname: kind === 'item' ? '/objet/[id]' : '/vetement/[id]', params: { id } });
      router.push({ pathname: '/pret/[id]', params: { id: loan.id, done: 'lent' } });
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };

  return (
    <FlowScreen>
      <StepHeader title="Vérifie le prêt" step={3} total={3} />

      <InfoCard
        title="Le prêt"
        rows={[
          ['Objet', draft.possession?.name],
          ['Prêté à', draft.borrower?.displayName],
          ['Retour prévu', due ? shortDate(due) : 'Non défini'],
        ]}
      />
      {note !== '' && (
        <View className="px-5">
          <Section title="Note">
            <Text className="font-luciole text-body text-ink dark:text-ink-night">{note}</Text>
          </Section>
        </View>
      )}

      <ActionBar note={`Quand ${draft.borrower?.displayName ?? 'ton ami'} aura l’objet en main, il passera en « Prêté ». Il reçoit une notification.`}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label="Confirmer le prêt" onPress={save} loading={saving} />
        <Button label="Modifier" variant="secondary" onPress={() => router.back()} disabled={saving} />
      </ActionBar>
    </FlowScreen>
  );
}
