import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('loans');
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
      setError(e instanceof Error ? e.message : t('review.saveError'));
    }
  };

  return (
    <FlowScreen>
      <StepHeader title={t('review.title')} step={3} total={3} />

      <InfoCard
        title={t('review.loan')}
        rows={[
          [t('review.object'), draft.possession?.name],
          [t('review.lentTo'), draft.borrower?.displayName],
          [t('review.expectedReturn'), due ? shortDate(due) : t('review.notDefined')],
        ]}
      />
      {note !== '' && (
        <View className="px-5">
          <Section title={t('review.note')}>
            <Text className="font-luciole text-body text-ink dark:text-ink-night">{note}</Text>
          </Section>
        </View>
      )}

      <ActionBar note={t('review.noteText', { name: draft.borrower?.displayName ?? t('review.friendFallback') })}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label={t('review.confirm')} onPress={save} loading={saving} />
        <Button label={t('review.edit')} variant="secondary" onPress={() => router.back()} disabled={saving} />
      </ActionBar>
    </FlowScreen>
  );
}
