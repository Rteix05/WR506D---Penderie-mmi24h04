import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chips } from '@/components/form/Chips';
import { DetailHero, DetailTitle, Section } from '@/components/inventory/Detail';
import { BackButton } from '@/components/ui/BackButton';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { TextField } from '@/components/ui/TextField';
import { DUE_CHOICES, dueDateOf, EVENT_LABEL, loanBadge, loanGesture, shortDate, useLoan, type DueChoice, type Gesture, type Loan } from '@/lib/loans';
import { artOf, CONDITION_LABEL, type Possession } from '@/lib/possessions';

const DONE = {
  lent: { title: 'Prêt enregistré !', text: 'Une notification est partie.' },
  returned: { title: 'Objet rendu !', text: 'Il est de retour dans ta penderie.' },
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
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(null);
    }
  };
  const confirm = (title: string, text: string, label: string, gesture: Gesture) =>
    Alert.alert(title, text, [
      { text: 'Retour', style: 'cancel' },
      { text: label, style: 'destructive', onPress: () => void act(gesture) },
    ]);
  const newDue = dueDateOf(due, otherDate);

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-10">
        <SafeAreaView edges={['top']} className="bg-ink/[0.04] dark:bg-ink-night/[0.06]">
          <DetailHero photo={l.possession.photo ?? undefined} art={artOf(l.possession.kind, { id: l.possession.id } as Possession, undefined)} height={240} scale={150 / 44.1} />
        </SafeAreaView>
        {done && DONE[done] && <Banner tone="success" title={DONE[done].title} text={DONE[done].text} />}
        <DetailTitle name={l.possession.name} meta={borrower ? `Emprunté à ${l.lender.displayName}` : `Prêté à ${l.borrower.displayName}`} status={badge} />

        <View className="gap-3">
          <InfoCard
            title={borrower ? `Objet emprunté à ${l.lender.displayName}` : 'Le prêt'}
            rows={[
              ['Propriétaire', borrower ? l.lender.displayName : lender ? 'Toi' : l.lender.displayName],
              ['Emprunteur', borrower ? 'Toi' : l.borrower.displayName],
              ['Demandé le', l.status === 'REQUESTED' || l.acceptedAt !== l.requestedAt ? shortDate(l.requestedAt) : null],
              ['Remis le', l.receivedAt && shortDate(l.receivedAt)],
              [l.status === 'ACTIVE' || l.status === 'ACCEPTED' ? 'À rendre avant le' : 'Retour prévu', l.dueDate ? shortDate(l.dueDate) : isPending(l) ? 'Non défini' : null],
              ['Retour déclaré le', l.returnDeclaredAt && shortDate(l.returnDeclaredAt)],
              ['Rendu le', l.returnConfirmedAt && shortDate(l.returnConfirmedAt)],
              ['État au départ', l.conditionAtStart && CONDITION_LABEL[l.conditionAtStart]],
              ['État au retour', l.conditionAtReturn && CONDITION_LABEL[l.conditionAtReturn]],
            ]}
          />
          {l.overdue && <Banner tone="error" title="En retard" text={`Le retour était prévu le ${shortDate(l.dueDate ?? '')}.`} />}

          {(l.note || l.returnNote) && (
            <View className="gap-3 px-5">
              {l.note && (
                <Section title="Note">
                  <Text className="font-luciole text-body text-ink dark:text-ink-night">{l.note}</Text>
                </Section>
              )}
              {l.returnNote && (
                <Section title="Au retour">
                  <Text className="font-luciole text-body text-ink dark:text-ink-night">{l.returnNote}</Text>
                </Section>
              )}
            </View>
          )}

          {lender && isPending(l) && (
            <View className="px-5">
              <Section title="Date de retour" link={{ label: editingDue ? 'Garder la date' : 'Changer la date', onPress: () => setEditingDue(!editingDue) }}>
                {editingDue && (
                  <View className="gap-3">
                    <Chips label="Nouvelle date" options={DUE_CHOICES} selected={[due]} onToggle={setDue} />
                    {due === 'other' && <TextField label="Date de retour (JJ/MM/AAAA)" value={otherDate} onChangeText={setOtherDate} placeholder="20/12/2026" maxLength={10} keyboardType="numbers-and-punctuation" />}
                    <Button label="Enregistrer la date" variant="secondary" onPress={() => void act('due-date', { dueDate: newDue })} disabled={newDue === undefined} loading={busy === 'due-date'} />
                  </View>
                )}
              </Section>
            </View>
          )}

          {l.events && l.events.length > 0 && (
            <View className="px-5">
              <Section title="Historique" gap="gap-3">
                {l.events.map((e, i) => (
                  <View key={`${e.type}-${i}`} className="flex-row items-center justify-between gap-4">
                    <Text className="flex-1 font-luciole text-legend text-ink dark:text-ink-night">
                      {EVENT_LABEL[e.type] ?? e.type}
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
              <Button label="Accepter" onPress={() => void act('accept')} loading={busy === 'accept'} />
              <Button label="Refuser" variant="secondary" onPress={() => void act('decline')} loading={busy === 'decline'} />
            </>
          )}
          {borrower && l.status === 'ACCEPTED' && <Button label="J'ai l'objet" onPress={() => void act('received')} loading={busy === 'received'} />}
          {borrower && l.status === 'ACTIVE' && !l.returnDeclaredAt && <Button label="Rendre" onPress={() => void act('declare-return')} loading={busy === 'declare-return'} />}
          {lender && l.status === 'ACTIVE' && (
            <>
              <Button label={l.returnDeclaredAt ? `Confirmer le retour` : 'Objet rendu'} onPress={() => router.push({ pathname: '/pret/[id]/retour', params: { id: l.id } })} />
              <Button label="Déclarer perdu" variant="secondary" onPress={() => confirm('Objet perdu ?', `« ${l.possession.name} » passera en « Perdu ». Le prêt sera clos.`, 'Déclarer perdu', 'lost')} loading={busy === 'lost'} />
            </>
          )}
          {(l.status === 'REQUESTED' || l.status === 'ACCEPTED') && (lender || borrower) && (
            <Button
              label={l.status === 'REQUESTED' && borrower ? 'Retirer ma demande' : 'Annuler le prêt'}
              variant="secondary"
              onPress={() => confirm('Annuler le prêt ?', `Le prêt avec ${other} sera clos.`, 'Annuler le prêt', 'cancel')}
              loading={busy === 'cancel'}
            />
          )}
          {l.possession.canView && (
            <Button
              label="Voir l'objet"
              variant="ghost"
              onPress={() => router.push({ pathname: l.possession.kind === 'item' ? '/objet/[id]' : '/vetement/[id]', params: { id: l.possession.id } })}
            />
          )}
          {borrower && l.status === 'ACTIVE' && l.returnDeclaredAt && (
            <Text className="text-center font-luciole text-legend text-muted dark:text-muted-night">{`Tu as dit l’avoir rendu le ${shortDate(l.returnDeclaredAt)} : ${l.lender.displayName} doit confirmer.`}</Text>
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
