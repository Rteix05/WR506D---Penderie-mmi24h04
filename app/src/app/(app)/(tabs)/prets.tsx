import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/inventory/EmptyState';
import { PhotoArea } from '@/components/inventory/PossessionCard';
import { SectionHeader } from '@/components/places/Blocks';
import { BackButton } from '@/components/ui/BackButton';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { isOpen, loanBadge, loanLine, useLoans, type Loan } from '@/lib/loans';
import { artOf, type Possession } from '@/lib/possessions';

type Tab = 'lender' | 'borrower';
const TABS: { value: Tab; label: string }[] = [
  { value: 'lender', label: "J'ai prêté" },
  { value: 'borrower', label: "J'ai emprunté" },
];

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * « Mes prêts » (maquette, lot 05, « Prêt — Mes prêts · J'ai prêté » et
 * « · J'ai emprunté ») : deux onglets, les prêts en cours (demandés,
 * acceptés, chez l'emprunteur) puis les terminés. Une carte ouvre la fiche
 * du prêt, où se font les gestes.
 */
export default function LoansScreen() {
  const [tab, setTab] = useState<Tab>('lender');
  const loans = useLoans(tab);
  const all = loans.data ?? [];
  const open = all.filter(isOpen);
  const closed = all.filter((l) => !isOpen(l));
  const late = open.filter((l) => l.overdue).length;
  const legend = loans.data
    ? open.length === 0
      ? 'Aucun prêt en cours'
      : [plural(open.length, 'en cours', 'en cours'), late > 0 && plural(late, 'en retard', 'en retard')].filter(Boolean).join(' · ')
    : ' ';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-14 pt-5">
        <View className="h-11 flex-row items-center px-5">
          <BackButton />
        </View>
        <View className="px-5">
          <ScreenTitle title="Mes prêts" legend={legend} />
        </View>

        {/* Deux onglets, un seul actif : une bascule de contenu (rail gris, onglet plein). */}
        <View accessibilityRole="tablist" className="mx-5 flex-row rounded-full bg-ink/[0.05] p-1 dark:bg-ink-night/[0.08]">
          {TABS.map((t) => {
            const on = t.value === tab;

            return (
              <Pressable
                key={t.value}
                accessibilityRole="tab"
                aria-selected={on}
                onPress={() => setTab(t.value)}
                style={on ? E1 : undefined}
                className={`h-9 flex-1 items-center justify-center rounded-full ${on ? 'bg-surface dark:bg-surface-night' : ''}`}>
                <Text className={`font-luciole-bold text-legend ${on ? 'text-ink dark:text-ink-night' : 'text-muted dark:text-muted-night'}`}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loans.isPending && <ActivityIndicator className="pt-8" />}
        {loans.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{loans.error.message}</Text>}

        {loans.data && all.length === 0 && (
          <EmptyState
            icon="search"
            title={tab === 'lender' ? 'Rien de prêté' : 'Rien d’emprunté'}
            text={
              tab === 'lender'
                ? 'Ouvre un objet ou un vêtement disponible et touche « Prêter » : tu sauras toujours chez qui il est.'
                : 'Quand un ami te prête quelque chose, ça apparaît ici, avec la date de retour.'
            }
          />
        )}

        {open.length > 0 && <View className="gap-3">{open.map((l) => <LoanCard key={l.id} loan={l} />)}</View>}

        {closed.length > 0 && (
          <View className="gap-3">
            <SectionHeader title="Terminés" aside={plural(closed.length, 'prêt', 'prêts')} />
            {closed.map((l) => (
              <LoanCard key={l.id} loan={l} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Carte de prêt (maquette, « cartePret ») : la vignette de l'objet, ce qui
 * compte en une ligne (à qui, jusqu'à quand), le statut en pastille.
 */
function LoanCard({ loan }: { loan: Loan }) {
  const badge = loanBadge(loan);
  const line = loanLine(loan);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[loan.possession.name, line, badge.label].join(', ')}
      onPress={() => router.push({ pathname: '/pret/[id]', params: { id: loan.id } })}
      style={E1}
      className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-3 active:opacity-80 dark:bg-surface-night">
      <View className="h-14 w-14 overflow-hidden rounded-sm">
        <PhotoArea photo={loan.possession.photo ?? undefined} art={artOf(loan.possession.kind, { id: loan.possession.id } as Possession, undefined)} scale={39.2 / 44.1} height={56} />
      </View>
      <View className="flex-1 items-start gap-1">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{loan.possession.name}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{line}</Text>
        <View className={`rounded-full px-2 py-1 ${badge.tint}`}>
          <Text className={`font-luciole-bold text-legend ${badge.text}`}>{badge.label}</Text>
        </View>
      </View>
      <Text className="font-luciole-bold text-body text-muted/[0.85] dark:text-muted-night">›</Text>
    </Pressable>
  );
}
