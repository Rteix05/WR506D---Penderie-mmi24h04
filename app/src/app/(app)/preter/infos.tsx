import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { TextField } from '@/components/ui/TextField';
import { useLoanDraft } from '@/lib/loan-draft';
import { dueChoices, dueDateOf, shortDate } from '@/lib/loans';

/**
 * Étape 2 « Informations du prêt » (maquette, « Prêt — Informations ») :
 * la date de retour prévue, facultative (décision client du 21/09), et une
 * note pour l'emprunteur. Le rappel de la maquette viendra avec les
 * notifications.
 */
export default function LendInfoStep() {
  const { t } = useTranslation('loans');
  const { draft, update } = useLoanDraft();
  const due = dueDateOf(draft.due, draft.otherDate);
  const otherInvalid = draft.due === 'other' && draft.otherDate.trim().length >= 10 && due === undefined;
  const who = draft.borrower?.displayName ?? '';

  return (
    <FlowScreen>
      <StepHeader title={t('info.title')} step={2} total={3} />

      <InfoCard title={t('info.loan')} rows={[[t('info.object'), draft.possession?.name], [t('info.lentTo'), who]]} />

      <View className="gap-6 px-5">
        <Chips label={t('info.dueLabel')} options={dueChoices()} selected={[draft.due]} onToggle={(value) => update({ due: value })} />
        {draft.due === 'other' && (
          <TextField
            label={t('info.dateLabel')}
            value={draft.otherDate}
            onChangeText={(otherDate) => update({ otherDate })}
            placeholder="20/12/2026"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={otherInvalid ? t('info.dateError') : undefined}
          />
        )}
        <TextField
          label={t('info.noteLabel', { name: who })}
          value={draft.note}
          onChangeText={(note) => update({ note })}
          placeholder={t('info.notePlaceholder')}
          autoCapitalize="sentences"
          multiline
          maxLength={1000}
          hint={due ? t('info.due', { date: shortDate(due) }) : due === null ? t('info.noDue') : undefined}
        />
      </View>

      <ActionBar>
        <Button label={t('info.continue')} onPress={() => router.push('/preter/verification')} disabled={due === undefined} />
      </ActionBar>
    </FlowScreen>
  );
}
