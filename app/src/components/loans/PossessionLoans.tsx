import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { Section } from '@/components/inventory/Detail';
import { isOpen, loanBadge, requestLoan, shortDate, usePossessionLoans, type Loan } from '@/lib/loans';
import type { Kind, Possession } from '@/lib/possessions';

/**
 * Le prêt sur la fiche d'un objet ou d'un vêtement (maquette, « Objet —
 * Fiche » et lot 05) : où il est quand il est prêté (« Chez Thomas »), son
 * historique de prêts pour le propriétaire.
 */
export function PossessionLoans({ possession, owner }: { possession: Possession; owner: boolean }) {
  const history = usePossessionLoans(possession['@id'], owner);
  const lent = possession.lentTo;
  const loans = history.data ?? [];
  const promised = loans.find((l) => l.status === 'ACCEPTED');
  const asked = loans.filter((l) => l.status === 'REQUESTED');
  const past = loans.filter((l) => !isOpen(l));

  return (
    <>
      {lent && (
        <Section title="Prêté" link={{ label: 'Voir le prêt', onPress: () => openLoan(lent.loan) }}>
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">Chez {lent.borrower}</Text>
          <Text className={`font-luciole text-legend ${lent.overdue ? 'text-error dark:text-error-night' : 'text-muted dark:text-muted-night'}`}>
            {lent.dueDate ? `${lent.overdue ? 'Devait revenir le' : 'Retour prévu le'} ${shortDate(lent.dueDate)}` : 'Retour prévu : non défini'}
          </Text>
        </Section>
      )}
      {promised && (
        <Section title="Promis" link={{ label: 'Voir le prêt', onPress: () => openLoan(promised.id) }}>
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">À remettre à {promised.borrower.displayName}</Text>
        </Section>
      )}
      {asked.length > 0 && (
        <Section title={asked.length > 1 ? `${asked.length} demandes d’emprunt` : 'Une demande d’emprunt'} gap="gap-3">
          {asked.map((l) => (
            <LoanLine key={l.id} loan={l} text={`${l.borrower.displayName} · ${shortDate(l.requestedAt)}`} />
          ))}
        </Section>
      )}
      {past.length > 0 && (
        <Section title="Historique des prêts" gap="gap-3">
          {past.slice(0, 5).map((l) => (
            <LoanLine key={l.id} loan={l} text={`${l.borrower.displayName} · ${shortDate(l.receivedAt ?? l.requestedAt)}${l.returnConfirmedAt ? ` → ${shortDate(l.returnConfirmedAt)}` : ''}`} />
          ))}
        </Section>
      )}
    </>
  );
}

function LoanLine({ loan, text }: { loan: Loan; text: string }) {
  const badge = loanBadge(loan);

  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${text}, ${badge.label}`} onPress={() => openLoan(loan.id)} hitSlop={4} className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 font-luciole text-legend text-ink dark:text-ink-night">{text}</Text>
      <View className={`rounded-full px-2 py-1 ${badge.tint}`}>
        <Text className={`font-luciole-bold text-legend ${badge.text}`}>{badge.label}</Text>
      </View>
    </Pressable>
  );
}

function openLoan(id: string) {
  router.push({ pathname: '/pret/[id]', params: { id } });
}

/**
 * L'action principale d'une fiche et sa note (maquette, « Detail/Action
 * bar ») : « Prêter » pour le propriétaire d'un bien disponible, « Demander
 * à l'emprunter » pour qui voit le bien d'un ami, sinon une note qui dit
 * pourquoi on ne peut pas.
 */
export function useLoanAction(possession: Possession | undefined, kind: Kind, owner: boolean): { primary?: { label: string; onPress: () => void }; note?: string } {
  const queryClient = useQueryClient();
  const history = usePossessionLoans(possession?.['@id'], owner);
  if (!possession) return {};

  const p = possession;
  const what = kind === 'item' ? 'cet objet' : 'ce vêtement';
  if (p.incomplete) return {};
  if (p.availability === 'LENT') return { note: owner ? `Tu ne peux pas prêter ${what} : il est chez ${p.lentTo?.borrower ?? 'quelqu’un'}.` : undefined };
  if (p.availability === 'LOST') return { note: `${what === 'cet objet' ? 'Cet objet' : 'Ce vêtement'} est perdu : il ne se prête plus.` };
  if (p.availability === 'SOLD') return { note: `${what === 'cet objet' ? 'Cet objet' : 'Ce vêtement'} est vendu.` };

  if (owner) {
    const promised = history.data?.find((l) => l.status === 'ACCEPTED');
    if (promised) return { note: `Déjà promis à ${promised.borrower.displayName} : annule ce prêt pour le prêter à quelqu’un d’autre.` };

    return { primary: { label: 'Prêter', onPress: () => router.push({ pathname: '/preter', params: { kind, id: p.id, iri: p['@id'], name: p.name } }) } };
  }

  // Pas de confirmation : une demande se retire ensuite depuis la fiche du prêt.
  const ask = async () => {
    try {
      const loan = await requestLoan(queryClient, { possession: p['@id'], note: null });
      openLoan(loan.id);
    } catch (e) {
      Alert.alert('Demande impossible', e instanceof Error ? e.message : '');
    }
  };

  return { primary: { label: 'Demander à l’emprunter', onPress: () => void ask() } };
}
