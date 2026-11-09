import { router } from 'expo-router';
import { View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { TextField } from '@/components/ui/TextField';
import { useLoanDraft } from '@/lib/loan-draft';
import { DUE_CHOICES, dueDateOf, shortDate } from '@/lib/loans';

/**
 * Étape 2 « Informations du prêt » (maquette, « Prêt — Informations ») :
 * la date de retour prévue, facultative (décision client du 21/09), et une
 * note pour l'emprunteur. Le rappel de la maquette viendra avec les
 * notifications.
 */
export default function LendInfoStep() {
  const { draft, update } = useLoanDraft();
  const due = dueDateOf(draft.due, draft.otherDate);
  const otherInvalid = draft.due === 'other' && draft.otherDate.trim().length >= 10 && due === undefined;
  const who = draft.borrower?.displayName ?? '';

  return (
    <FlowScreen>
      <StepHeader title="Informations du prêt" step={2} total={3} />

      <InfoCard title="Le prêt" rows={[['Objet', draft.possession?.name], ['Prêté à', who]]} />

      <View className="gap-6 px-5">
        <Chips label="Date de retour prévue" options={DUE_CHOICES} selected={[draft.due]} onToggle={(value) => update({ due: value })} />
        {draft.due === 'other' && (
          <TextField
            label="Date de retour (JJ/MM/AAAA)"
            value={draft.otherDate}
            onChangeText={(otherDate) => update({ otherDate })}
            placeholder="20/12/2026"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={otherInvalid ? 'Une date à venir, au format JJ/MM/AAAA.' : undefined}
          />
        )}
        <TextField
          label={`Note pour ${who} (facultatif)`}
          value={draft.note}
          onChangeText={(note) => update({ note })}
          placeholder="Les mèches sont dans la boîte."
          autoCapitalize="sentences"
          multiline
          maxLength={1000}
          hint={due ? `Retour prévu le ${shortDate(due)}` : due === null ? 'Retour prévu : non défini' : undefined}
        />
      </View>

      <ActionBar>
        <Button label="Continuer" onPress={() => router.push('/preter/verification')} disabled={due === undefined} />
      </ActionBar>
    </FlowScreen>
  );
}
