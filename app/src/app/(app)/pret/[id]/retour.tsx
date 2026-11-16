import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { LocationStep } from '@/components/add/LocationStep';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { TextField } from '@/components/ui/TextField';
import type { Location } from '@/lib/add-draft';
import { loanGesture, shortDate, useLoan } from '@/lib/loans';
import { CONDITION_LABEL, type ConditionValue } from '@/lib/possessions';

const CONDITIONS = (Object.keys(CONDITION_LABEL) as ConditionValue[]).map((value) => ({ value, label: CONDITION_LABEL[value] }));

type Where = 'usual' | 'elsewhere';
const WHERE: { value: Where; labelKey: 'return.whereUsual' | 'return.whereElsewhere' }[] = [
  { value: 'usual', labelKey: 'return.whereUsual' },
  { value: 'elsewhere', labelKey: 'return.whereElsewhere' },
];

/**
 * « Objet rendu ? » (maquette, « Prêt — Retour · Objet rendu ? », et
 * « État au retour » du lot 21) : le prêteur constate l'état — pire qu'au
 * départ, un dommage est noté dans l'historique — et range l'objet à sa
 * place habituelle ou ailleurs (le déplacement est tracé).
 */
export default function ReturnScreen() {
  const { t } = useTranslation('loans');
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = useLoan(id);
  const queryClient = useQueryClient();
  const [condition, setCondition] = useState<ConditionValue | null>(null);
  const [where, setWhere] = useState<Where>('usual');
  const [location, setLocation] = useState<Location>({ place: null, room: null, storage: null, box: null });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loan.data) {
    return (
      <FlowScreen>
        <StepHeader title={t('return.title')} close />
        {loan.isError ? <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{loan.error.message}</Text> : <ActivityIndicator />}
      </FlowScreen>
    );
  }

  const l = loan.data;
  const state = condition ?? l.conditionAtStart;
  const worse = l.conditionAtStart !== null && state !== null && CONDITIONS.findIndex((c) => c.value === state) > CONDITIONS.findIndex((c) => c.value === l.conditionAtStart);
  const elsewhere = where === 'elsewhere';

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await loanGesture(queryClient, l.id, 'confirm-return', {
        condition: state,
        note: note.trim() || null,
        ...(elsewhere ? { room: location.room?.iri, storage: location.storage?.iri ?? null, box: location.box?.iri ?? null } : {}),
      });
      router.back();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : t('return.saveError'));
    }
  };

  return (
    <FlowScreen>
      <StepHeader title={t('return.title')} legend={t('return.legend', { name: l.possession.name, borrower: l.borrower.displayName })} close />

      <InfoCard
        title={t('return.loan')}
        rows={[
          [t('return.lentOn'), l.receivedAt && shortDate(l.receivedAt)],
          [t('return.expectedReturn'), l.dueDate ? shortDate(l.dueDate) : t('return.notDefined')],
          [t('return.returnedSaid'), l.returnDeclaredAt && shortDate(l.returnDeclaredAt)],
        ]}
      />

      <View className="gap-6 px-5">
        <Chips
          label={l.conditionAtStart ? t('return.conditionWithStart', { condition: CONDITION_LABEL[l.conditionAtStart] }) : t('return.condition')}
          options={CONDITIONS}
          selected={state ? [state] : []}
          onToggle={setCondition}
        />
        {worse && <Text className="font-luciole text-legend text-error dark:text-error-night">{t('return.worse')}</Text>}
        <Chips label={t('return.where')} options={WHERE.map((w) => ({ value: w.value, label: t(w.labelKey) }))} selected={[where]} onToggle={setWhere} />
      </View>
      {elsewhere && <LocationStep kind={l.possession.kind} location={location} onChange={setLocation} />}
      <View className="px-5">
        <TextField label={t('return.note')} value={note} onChangeText={setNote} placeholder={t('return.notePlaceholder')} autoCapitalize="sentences" multiline maxLength={1000} />
      </View>

      <ActionBar note={elsewhere ? t('return.actionElsewhere') : t('return.actionUsual')}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label={t('return.confirm')} onPress={save} loading={saving} disabled={elsewhere && !location.room} />
      </ActionBar>
    </FlowScreen>
  );
}
