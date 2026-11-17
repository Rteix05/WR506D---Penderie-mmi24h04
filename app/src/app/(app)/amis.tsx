import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import type { PostAuthor } from '@/lib/feed';
import { answerRequest, askFriend, cancelRequest, decideApproval, useApprovals, useFriendRequests, useFriends, usePeopleSearch } from '@/lib/relations';

/**
 * « Amis et abonnés » (menu Profil) : trouver quelqu'un, répondre aux
 * demandes reçues, autoriser celles d'un profil enfant (tuteur), suivre
 * celles qu'on a envoyées, et ses amis. Toucher une personne ouvre sa page
 * (abonnement, retrait d'ami).
 */
export default function FriendsScreen() {
  const { t } = useTranslation('social');
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const search = usePeopleSearch(q);
  const requests = useFriendRequests();
  const approvals = useApprovals();
  const friends = useFriends();
  const [error, setError] = useState<string | null>(null);

  const act = (action: () => Promise<void>) => () => {
    setError(null);
    action().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  const received = requests.data?.received ?? [];
  const sent = requests.data?.sent ?? [];

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-12 pt-5" keyboardShouldPersistTaps="handled">
        <View className="flex-row px-5">
          <BackButton />
        </View>
        <View className="px-5">
          <ScreenTitle title={t('friends.title')} legend={friends.data ? t('friends.count', { count: friends.data.length }) : ' '} />
        </View>

        <View className="px-5">
          <TextInput
            accessibilityLabel={t('friends.search')}
            value={q}
            onChangeText={setQ}
            placeholder={t('friends.search')}
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            style={E1}
            className="h-12 rounded-sm bg-surface px-4 font-luciole text-body text-ink dark:bg-surface-night dark:text-ink-night"
          />
        </View>
        {error && <Text accessibilityRole="alert" className="px-5 font-luciole text-legend text-error dark:text-error-night">{error}</Text>}

        {q.trim().length >= 2 && (
          <Section title={t('friends.results')}>
            {search.isPending && <ActivityIndicator />}
            {search.data?.length === 0 && <Empty text={t('friends.noResult')} />}
            {search.data?.map((p) => (
              <Person
                key={p.id}
                person={p}
                action={
                  p.relation.friend
                    ? { label: t('relation.friends'), muted: true }
                    : p.relation.request
                      ? { label: p.relation.request.direction === 'sent' ? t('relation.sent') : t('relation.received'), muted: true }
                      : { label: t('relation.add'), onPress: act(() => askFriend(queryClient, p.id)) }
                }
              />
            ))}
          </Section>
        )}

        {(approvals.data?.length ?? 0) > 0 && (
          <Section title={t('friends.approvals')}>
            {approvals.data?.map((a) => (
              <Card key={a.id}>
                <Text className="font-luciole text-body text-ink dark:text-ink-night">
                  {t('friends.approvalLine', { child: a.requester.displayName, other: a.subject?.displayName ?? '?' })}
                </Text>
                <Row>
                  <Link label={t('friends.allow')} onPress={act(() => decideApproval(queryClient, a.id, true))} />
                  <Link label={t('friends.refuse')} muted onPress={act(() => decideApproval(queryClient, a.id, false))} />
                </Row>
              </Card>
            ))}
          </Section>
        )}

        {received.length > 0 && (
          <Section title={t('friends.received', { count: received.length })}>
            {received.map((r) => (
              <Person
                key={r.id}
                person={r.profile}
                action={{ label: t('relation.accept'), onPress: act(() => answerRequest(queryClient, r.id, true)) }}
                secondary={{ label: t('relation.decline'), onPress: act(() => answerRequest(queryClient, r.id, false)) }}
              />
            ))}
          </Section>
        )}

        {sent.length > 0 && (
          <Section title={t('friends.sent')}>
            {sent.map((r) => (
              <Person
                key={r.id}
                person={r.profile}
                meta={r.awaitingGuardian ? t('relation.awaitingGuardian') : undefined}
                action={{ label: t('relation.cancel'), muted: true, onPress: act(() => cancelRequest(queryClient, r.id)) }}
              />
            ))}
          </Section>
        )}

        <Section title={t('friends.mine')}>
          {friends.isPending && <ActivityIndicator />}
          {friends.data?.length === 0 && <Empty text={t('friends.none')} />}
          {friends.data?.map((p) => <Person key={p.id} person={p} />)}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="px-5 font-luciole-bold text-body text-ink dark:text-ink-night">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <View style={E1} className="mx-5 gap-2 rounded-md bg-surface p-4 dark:bg-surface-night">
      {children}
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View className="flex-row gap-5">{children}</View>;
}

function Link({ label, onPress, muted = false }: { label: string; onPress?: () => void; muted?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress} hitSlop={8} className="min-h-[32px] justify-center active:opacity-70">
      <Text className={`font-luciole-bold text-legend ${muted ? 'text-muted dark:text-muted-night' : 'text-primary dark:text-primary-night'}`}>{label}</Text>
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return <Text className="px-5 font-luciole text-legend text-muted dark:text-muted-night">{text}</Text>;
}

type Action = { label: string; onPress?: () => void; muted?: boolean };

/** Une personne : avatar, nom, identifiant ; la toucher ouvre sa page. */
function Person({ person, meta, action, secondary }: { person: PostAuthor; meta?: string; action?: Action; secondary?: Action }) {
  return (
    <View style={E1} className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-3 dark:bg-surface-night">
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/fil/profil/[id]', params: { id: person.id } })}
        className="flex-1 flex-row items-center gap-3 active:opacity-80">
        <ProfileAvatar name={person.displayName} size={40} />
        <View className="flex-1">
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{person.displayName}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{meta ?? `@${person.username}`}</Text>
        </View>
      </Pressable>
      <View className="items-end">
        {action && <Link label={action.label} onPress={action.onPress} muted={action.muted} />}
        {secondary && <Link label={secondary.label} onPress={secondary.onPress} muted />}
      </View>
    </View>
  );
}
