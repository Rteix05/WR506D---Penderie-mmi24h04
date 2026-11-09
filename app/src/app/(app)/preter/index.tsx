import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
        accessibilityLabel={`${c.displayName}, ${c.household ? 'profil de ton compte' : 'ami'}`}
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
            <Text className="font-luciole-bold text-legend text-[#C21B5E] dark:text-primary-night">Choisi</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <FlowScreen>
      <StepHeader title="À qui tu le prêtes ?" legend={`Étape 1 sur 3 · ${name}`} step={1} total={3} close />

      {candidates.isPending ? (
        <ActivityIndicator />
      ) : candidates.isError ? (
        <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{candidates.error.message}</Text>
      ) : candidates.data.length === 0 ? (
        <Text className="px-5 font-luciole text-body text-muted dark:text-muted-night">
          Tu ne peux prêter qu’à un ami ou à un profil de ton compte. Ajoute d’abord un ami, ou un profil de la famille depuis « Mon profil ».
        </Text>
      ) : (
        <>
          <SearchField value={query} onChange={setQuery} placeholder="Rechercher un ami..." />
          {household.length > 0 && (
            <View className="gap-3">
              <SectionHeader title="Ton compte" />
              {household.map(row)}
            </View>
          )}
          {friends.length > 0 && (
            <View className="gap-3">
              <SectionHeader title="Tous mes amis" aside={friends.length > 1 ? `${friends.length} amis` : undefined} />
              {friends.map(row)}
            </View>
          )}
          {matches.length === 0 && <Text className="px-5 font-luciole text-body text-muted dark:text-muted-night">Personne ne s’appelle comme ça.</Text>}
        </>
      )}

      <ActionBar>
        <Button label="Continuer" onPress={() => router.push('/preter/infos')} disabled={draft.borrower === null} />
      </ActionBar>
    </FlowScreen>
  );
}
