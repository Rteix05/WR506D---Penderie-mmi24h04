import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chips } from '@/components/form/Chips';
import { DetailHero, DetailTitle, Section } from '@/components/inventory/Detail';
import { BackButton } from '@/components/ui/BackButton';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { TextField } from '@/components/ui/TextField';
import { dueChoices, dueDateOf, eventLabel, loanBadge, loanGesture, shortDate, useLoan, type DueChoice, type Gesture, type Loan } from '@/lib/loans';
import { artOf, CONDITION_LABEL, type Possession } from '@/lib/possessions';

const DONE = {
  lent: { title: 'detail.done.lent.title', text: 'detail.done.lent.text' },
  returned: { title: 'detail.done.returned.title', text: 'detail.done.returned.text' },
} as const;

/**
 * Fiche d'un prêt (maquette, lot 05, et fiche « Emprunté » du lot 21) :
 * l'objet, qui prête à qui et jusqu'à quand, le journal, et les gestes de
 * celui qui regarde :
 *
 *  - le prêteur accepte ou refuse une demande, change la date de retour,
 *    confirme le retour (écran « Objet rendu ? ») ou déclare l'objet perdu ;
 *  - l'emprunteur dit qu'il a l'objet en main, puis qu'il l'a rendu ;
 *  - l'un ou l'autre annule tant que l'objet n'a pas été remis.
 *
 * Paramètre done (lent, returned) : le bandeau de confirmation d'un parcours.
 */
export default function LoanScreen() {
  const { t } = useTranslation('loans');
  const { id, done } = useLocalSearchParams<{ id: string; done?: keyof typeof DONE }>();
  const loan = useLoan(id);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<Gesture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingDue, setEditingDue] = useState(false);
  const [due, setDue] = useState<DueChoice>('two-weeks');
  const [otherDate, setOtherDate] = useState('');

  if (!loan.data) {
    return (
      <SafeAreaView className="flex-1 gap-6 bg-bg px-5 pt-5 dark:bg-bg-night">
        <BackButton />
        {loan.isError ? <Text className="font-luciole text-body text-error dark:text-error-night">{loan.error.message}</Text> : <ActivityIndicator />}
      </SafeAreaView>
    );
  }

  const l = loan.data;
  const lender = l.role === 'lender';
  const borrower = l.role === 'borrower';
  const badge = loanBadge(l);
  const other = borrower ? l.lender.displayName : l.borrower.displayName;

  const act = async (gesture: Gesture, body: Record<string, unknown> = {}) => {
    setBusy(gesture);
    setError(null);
    try {
      await loanGesture(queryClient, l.id, gesture, body);
      setEditingDue(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('detail.actionError'));
    } finally {
      setBusy(null);
    }
  };
  const confirm = (title: string, text: string, label: string, gesture: Gesture) =>
    Alert.alert(title, text, [
      { text: t('detail.cancel'), style: 'cancel' },
      { text: label, style: 'destructive', onPress: () => void act(gesture) },
    ]);
  const newDue = dueDateOf(due, otherDate);

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-10">
        <SafeAreaView edges={['top']} className="bg-ink/[0.04] dark:bg-ink-night/[0.06]">
          <DetailHero photo={l.possession.photo ?? undefined} art={artOf(l.possession.kind, { id: l.possession.id } as Possession, undefined)} height={240} scale={150 / 44.1} />
        </SafeAreaView>
        {done && DONE[done] && <Banner tone="success" title={t(DONE[done].title)} text={t(DONE[done].text)} />}
        <DetailTitle name={l.possession.name} meta={borrower ? t('detail.borrowedFrom', { name: l.lender.displayName }) : t('detail.lentTo', { name: l.borrower.displayName })} status={badge} />

        <View className="gap-3">
          <InfoCard
            title={borrower ? t('detail.borrowedTitle', { name: l.lender.displayName }) : t('detail.loanTitle')}
            rows={[
              [t('detail.owner'), borrower ? l.lender.displayName : lender ? t('detail.you') : l.lender.displayName],
              [t('detail.borrower'), borrower ? t('detail.you') : l.borrower.displayName],
              [t('detail.requestedOn'), l.status === 'REQUESTED' || l.acceptedAt !== l.requestedAt ? shortDate(l.requestedAt) : null],
              [t('detail.handedOn'), l.receivedAt && shortDate(l.receivedAt)],
              [l.status === 'ACTIVE' || l.status === 'ACCEPTED' ? t('detail.dueBefore') : t('detail.expectedReturn'), l.dueDate ? shortDate(l.dueDate) : isPending(l) ? t('detail.notDefined') : null],
              [t('detail.returnDeclaredOn'), l.returnDeclaredAt && shortDate(l.returnDeclaredAt)],
              [t('detail.returnedOn'), l.returnConfirmedAt && shortDate(l.returnConfirmedAt)],
              [t('detail.conditionStart'), l.conditionAtStart && CONDITION_LABEL[l.conditionAtStart]],
              [t('detail.conditionReturn'), l.conditionAtReturn && CONDITION_LABEL[l.conditionAtReturn]],
            ]}
          />
          {l.overdue && <Banner tone="error" title={t('detail.late')} text={t('detail.lateText', { date: shortDate(l.dueDate ?? '') })} />}

          {(l.note || l.returnNote) && (
            <View className="gap-3 px-5">
              {l.note && (
                <Section title={t('detail.note')}>
                  <Text className="font-luciole text-body text-ink dark:text-ink-night">{l.note}</Text>
                </Section>
              )}
              {l.returnNote && (
                <Section title={t('detail.atReturn')}>
                  <Text className="font-luciole text-body text-ink dark:text-ink-night">{l.returnNote}</Text>
                </Section>
              )}
            </View>
          )}

          {lender && isPending(l) && (
            <View className="px-5">
              <Section title={t('detail.dueDate')} link={{ label: editingDue ? t('detail.keepDate') : t('detail.changeDate'), onPress: () => setEditingDue(!editingDue) }}>
                <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{l.dueDate ? shortDate(l.dueDate) : t('detail.notSet')}</Text>
                {editingDue && (
                  <View className="gap-3">
                    <Chips label={t('detail.newDate')} options={dueChoices()} selected={[due]} onToggle={setDue} />
                    {due === 'other' && <TextField label={t('detail.returnLabel')} value={otherDate} onChangeText={setOtherDate} placeholder="20/12/2026" maxLength={10} keyboardType="numbers-and-punctuation" />}
                    <Button label={t('detail.saveDate')} variant="secondary" onPress={() => void act('due-date', { dueDate: newDue })} disabled={newDue === undefined} loading={busy === 'due-date'} />
                  </View>
                )}
              </Section>
            </View>
          )}

          {l.events && l.events.length > 0 && (
            <View className="px-5">
              <Section title={t('detail.history')} gap="gap-3">
                {l.events.map((e, i) => (
                  <View key={`${e.type}-${i}`} className="flex-row items-center justify-between gap-4">
                    <Text className="flex-1 font-luciole text-legend text-ink dark:text-ink-night">
                      {eventLabel(e.type)}
                      {e.actor ? ` · ${e.actor}` : ''}
                    </Text>
                    <Text className="font-luciole text-legend text-muted dark:text-muted-night">{shortDate(e.occurredAt)}</Text>
                  </View>
                ))}
              </Section>
            </View>
          )}
        </View>

        <View className="gap-3 px-5">
          {error && (
            <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
              {error}
            </Text>
          )}

          {lender && l.status === 'REQUESTED' && (
            <>
              <Button label={t('detail.accept')} onPress={() => void act('accept')} loading={busy === 'accept'} />
              <Button label={t('detail.decline')} variant="secondary" onPress={() => void act('decline')} loading={busy === 'decline'} />
            </>
          )}
          {borrower && l.status === 'ACCEPTED' && <Button label={t('detail.gotIt')} onPress={() => void act('received')} loading={busy === 'received'} />}
          {borrower && l.status === 'ACTIVE' && !l.returnDeclaredAt && <Button label={t('detail.giveBack')} onPress={() => void act('declare-return')} loading={busy === 'declare-return'} />}
          {lender && l.status === 'ACTIVE' && (
            <>
              <Button label={l.returnDeclaredAt ? t('detail.confirmReturn') : t('detail.objectReturned')} onPress={() => router.push({ pathname: '/pret/[id]/retour', params: { id: l.id } })} />
              <Button label={t('detail.declareLost')} variant="secondary" onPress={() => confirm(t('detail.lostTitle'), t('detail.lostText', { name: l.possession.name }), t('detail.declareLost'), 'lost')} loading={busy === 'lost'} />
            </>
          )}
          {(l.status === 'REQUESTED' || l.status === 'ACCEPTED') && (lender || borrower) && (
            <Button
              label={l.status === 'REQUESTED' && borrower ? t('detail.withdraw') : t('detail.cancelLoan')}
              variant="secondary"
              onPress={() => confirm(t('detail.cancelTitle'), t('detail.cancelText', { name: other }), t('detail.cancelLoan'), 'cancel')}
              loading={busy === 'cancel'}
            />
          )}
          {l.possession.canView && (
            <Button
              label={t('detail.viewObject')}
              variant="ghost"
              onPress={() => router.push({ pathname: l.possession.kind === 'item' ? '/objet/[id]' : '/vetement/[id]', params: { id: l.possession.id } })}
            />
          )}
          {borrower && l.status === 'ACTIVE' && l.returnDeclaredAt && (
            <Text className="text-center font-luciole text-legend text-muted dark:text-muted-night">{t('detail.returnedDeclared', { date: shortDate(l.returnDeclaredAt), name: l.lender.displayName })}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Un prêt pas encore terminé : sa date de retour compte encore. */
function isPending(l: Loan) {
  return l.status === 'REQUESTED' || l.status === 'ACCEPTED' || l.status === 'ACTIVE';
}
