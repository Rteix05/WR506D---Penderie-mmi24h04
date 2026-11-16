import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { SearchField } from '@/components/inventory/ListControls';
import { SectionHeader } from '@/components/places/Blocks';
import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { useLoanDraft } from '@/lib/loan-draft';
import { useCandidates, type Candidate } from '@/lib/loans';
import { normalize, type Kind } from '@/lib/possessions';

/**
 * Étape 1 « À qui tu le prêtes ? » (maquette, « Prêt — Choisir un ami ») :
 * une recherche, puis les profils de ton compte et tes amis. Un seul choix.
 *
 * Paramètres : kind, id, iri, name de l'objet prêté (depuis sa fiche).
 */
export default function LendWhoStep() {
  const { t } = useTranslation('loans');
  const params = useLocalSearchParams<{ kind: Kind; id: string; iri: string; name: string }>();
  const { draft, update } = useLoanDraft();
  const candidates = useCandidates();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (draft.possession === null && params.id) update({ possession: { kind: params.kind, id: params.id, iri: params.iri, name: params.name } });
  }, [draft.possession, params, update]);

  const matches = (candidates.data ?? []).filter((c) => normalize(`${c.displayName} ${c.username}`).includes(normalize(query)));
  const household = matches.filter((c) => c.household);
  const friends = matches.filter((c) => !c.household);
  const name = draft.possession?.name ?? params.name ?? '';

  const row = (c: Candidate) => {
    const on = draft.borrower?.id === c.id;

    return (
      <Pressable
        key={c.id}
        accessibilityRole="radio"
        aria-selected={on}
        accessibilityLabel={`${c.displayName}, ${c.household ? t('who.self') : t('who.friend')}`}
        onPress={() => update({ borrower: c })}
        style={E1}
        className={`mx-5 min-h-[72px] flex-row items-center gap-4 rounded-md px-4 py-3 active:opacity-80 ${on ? 'border-2 border-primary bg-primary/[0.06]' : 'bg-surface dark:bg-surface-night'}`}>
        <ProfileAvatar name={c.displayName} strong={on} />
        <View className="flex-1 gap-0.5">
          <Text className="font-luciole-bold text-[18px] text-ink dark:text-ink-night">{c.displayName}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">@{c.username}</Text>
        </View>
        {on && (
          <View className="rounded-full bg-primary/[0.12] px-2 py-1">
            <Text className="font-luciole-bold text-legend text-[#C21B5E] dark:text-primary-night">{t('who.chosen')}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <FlowScreen>
      <StepHeader title={t('who.title')} legend={t('who.step', { name })} step={1} total={3} close />

      {candidates.isPending ? (
        <ActivityIndicator />
      ) : candidates.isError ? (
        <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{candidates.error.message}</Text>
      ) : candidates.data.length === 0 ? (
        <Text className="px-5 font-luciole text-body text-muted dark:text-muted-night">{t('who.empty')}</Text>
      ) : (
        <>
          <SearchField value={query} onChange={setQuery} placeholder={t('who.search')} />
          {household.length > 0 && (
            <View className="gap-3">
              <SectionHeader title={t('who.account')} />
              {household.map(row)}
            </View>
          )}
          {friends.length > 0 && (
            <View className="gap-3">
              <SectionHeader title={t('who.friends')} aside={friends.length > 1 ? t('who.friendsCount', { count: friends.length }) : undefined} />
              {friends.map(row)}
            </View>
          )}
          {matches.length === 0 && <Text className="px-5 font-luciole text-body text-muted dark:text-muted-night">{t('who.noMatch')}</Text>}
        </>
      )}

      <ActionBar>
        <Button label={t('who.continue')} onPress={() => router.push('/preter/infos')} disabled={draft.borrower === null} />
      </ActionBar>
    </FlowScreen>
  );
}
