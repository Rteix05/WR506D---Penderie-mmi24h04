import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostCard } from '@/components/feed/PostCard';
import { ClothVisual } from '@/components/home/ClothVisual';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { useMe } from '@/lib/auth';
import { useFeed, useProfilePage, type Post } from '@/lib/feed';

type Tab = 'feed' | 'mine';

/**
 * Le fil d'actualité (Figma « Fil — Fil d'actualité ») : ce que tes amis
 * et les comptes que tu suis ont choisi de te montrer, et l'onglet « Mes
 * publications ». Pas d'inconnus ni de publicité.
 */
export default function FeedScreen() {
  const [tab, setTab] = useState<Tab>('feed');
  const me = useMe();
  const feed = useFeed();
  const mine = useProfilePage(tab === 'mine' ? me.data?.activeProfile : null);

  const posts: Post[] = tab === 'feed' ? (feed.data?.pages.flatMap((p) => p.posts) ?? []) : (mine.data?.posts ?? []);
  const query = tab === 'feed' ? feed : mine;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerClassName="gap-4 px-5 pb-10 pt-5"
        renderItem={({ item }) => <PostCard post={item} linked />}
        onEndReached={() => tab === 'feed' && feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
        onRefresh={() => query.refetch()}
        refreshing={query.isRefetching}
        ListHeaderComponent={
          <View className="gap-5 pb-1">
            <View className="flex-row">
              <BackButton />
            </View>
            <ScreenTitle title="Fil d'actualité" legend="Ce que tes amis ont choisi de te montrer" />
            <Segmented tab={tab} onChange={setTab} />
            <Pressable accessibilityRole="button" onPress={() => router.push('/look')} hitSlop={8} className="self-end active:opacity-80">
              <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">+ Publier un look</Text>
            </Pressable>
            {query.isPending && <ActivityIndicator className="py-6" />}
            {query.isError && <Text className="font-luciole text-body text-error dark:text-error-night">{query.error.message}</Text>}
          </View>
        }
        ListEmptyComponent={query.isSuccess ? <Empty mine={tab === 'mine'} /> : null}
        ListFooterComponent={
          <View className="gap-4 pt-2">
            {feed.isFetchingNextPage && <ActivityIndicator />}
            {posts.length > 0 && (
              <View className="flex-row items-center gap-3 rounded-md bg-ink/[0.05] p-4 dark:bg-ink-night/[0.08]">
                <Text className="flex-1 font-luciole text-legend text-muted dark:text-muted-night">Pas d&apos;inconnus ni de publicité : seules les personnes qui t&apos;ont choisi apparaissent ici.</Text>
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

/** « Fil | Mes publications » : interrupteur à deux segments de la maquette. */
function Segmented({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View accessibilityRole="tablist" className="flex-row rounded-full bg-ink/[0.06] p-1 dark:bg-ink-night/[0.1]">
      {(
        [
          ['feed', 'Fil'],
          ['mine', 'Mes publications'],
        ] as const
      ).map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === key }}
          onPress={() => onChange(key)}
          className={`h-10 flex-1 items-center justify-center rounded-full ${tab === key ? 'bg-surface dark:bg-surface-night' : ''}`}>
          <Text className={`font-luciole-bold text-legend ${tab === key ? 'text-ink dark:text-ink-night' : 'text-muted dark:text-muted-night'}`}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Figma « Fil — État · Fil vide ». */
function Empty({ mine }: { mine: boolean }) {
  return (
    <View className="items-center gap-4 py-8">
      <View className="h-28 w-28 items-center justify-center rounded-lg bg-cloth/[0.08]">
        <ClothVisual kind="veste" />
      </View>
      <Text className="text-center font-luciole-bold text-body uppercase text-ink dark:text-ink-night">{mine ? 'Rien de publié' : 'Ton fil est calme'}</Text>
      <Text className="text-center font-luciole text-body text-muted dark:text-muted-night">
        {mine ? 'Publie ton look du jour : tes amis verront tes vêtements pointés.' : "Tes amis n'ont rien partagé avec toi. Tu peux montrer ton look du jour à qui tu veux."}
      </Text>
      <Button label="Publier mon look" onPress={() => router.push('/look')} />
    </View>
  );
}
