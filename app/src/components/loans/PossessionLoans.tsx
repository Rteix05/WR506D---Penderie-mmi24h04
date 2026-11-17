import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('loans');
  const history = usePossessionLoans(possession['@id'], owner);
  const lent = possession.lentTo;
  const loans = history.data ?? [];
  const promised = loans.find((l) => l.status === 'ACCEPTED');
  const asked = loans.filter((l) => l.status === 'REQUESTED');
  const past = loans.filter((l) => !isOpen(l));

  return (
    <>
      {lent && (
        <Section title={t('possession.lent')} link={{ label: t('possession.seeLoan'), onPress: () => openLoan(lent.loan) }}>
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{t('possession.at', { name: lent.borrower })}</Text>
          <Text className={`font-luciole text-legend ${lent.overdue ? 'text-error dark:text-error-night' : 'text-muted dark:text-muted-night'}`}>
            {lent.dueDate ? t(lent.overdue ? 'possession.overdue' : 'possession.due', { date: shortDate(lent.dueDate) }) : t('possession.noDue')}
          </Text>
        </Section>
      )}
      {promised && (
        <Section title={t('possession.promised')} link={{ label: t('possession.seeLoan'), onPress: () => openLoan(promised.id) }}>
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{t('possession.giveTo', { name: promised.borrower.displayName })}</Text>
        </Section>
      )}
      {asked.length > 0 && (
        <Section title={t('possession.requests', { count: asked.length })} gap="gap-3">
          {asked.map((l) => (
            <LoanLine key={l.id} loan={l} text={`${l.borrower.displayName} · ${shortDate(l.requestedAt)}`} />
          ))}
        </Section>
      )}
      {past.length > 0 && (
        <Section title={t('possession.history')} gap="gap-3">
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
  const { t } = useTranslation('loans');
  const queryClient = useQueryClient();
  const history = usePossessionLoans(possession?.['@id'], owner);
  if (!possession) return {};

  const p = possession;
  if (p.incomplete) return {};
  if (p.availability === 'LENT') {
    return {
      note: owner
        ? t(kind === 'item' ? 'possession.lentNoteItem' : 'possession.lentNoteGarment', { name: p.lentTo?.borrower ?? t('possession.someone') })
        : undefined,
    };
  }
  if (p.availability === 'LOST') return { note: t(kind === 'item' ? 'possession.lostNoteItem' : 'possession.lostNoteGarment') };
  if (p.availability === 'SOLD') return { note: t(kind === 'item' ? 'possession.soldNoteItem' : 'possession.soldNoteGarment') };

  if (owner) {
    const promised = history.data?.find((l) => l.status === 'ACCEPTED');
    if (promised) return { note: t('possession.promisedNote', { name: promised.borrower.displayName }) };

    return { primary: { label: t('possession.lend'), onPress: () => router.push({ pathname: '/preter', params: { kind, id: p.id, iri: p['@id'], name: p.name } }) } };
  }

  // Pas de confirmation : une demande se retire ensuite depuis la fiche du prêt.
  const ask = async () => {
    try {
      const loan = await requestLoan(queryClient, { possession: p['@id'], note: null });
      openLoan(loan.id);
    } catch (e) {
      Alert.alert(t('possession.requestError'), e instanceof Error ? e.message : '');
    }
  };

  return { primary: { label: t('possession.ask'), onPress: () => void ask() } };
}
