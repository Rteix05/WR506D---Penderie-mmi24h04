import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/inventory/EmptyState';
import { BackButton } from '@/components/ui/BackButton';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { since } from '@/lib/feed';
import { markAllRead, markRead, targetOf, toneOf, useNotifications, type AppNotification } from '@/lib/notifications';

const TONE = {
  primary: { row: 'bg-primary/[0.06]', dot: 'bg-primary/[0.16]', text: 'text-primary dark:text-primary-night' },
  main: { row: 'bg-main/[0.06]', dot: 'bg-main/[0.16]', text: 'text-main dark:text-main-night' },
  error: { row: 'bg-error/[0.06]', dot: 'bg-error/[0.16]', text: 'text-error dark:text-error-night' },
  muted: { row: 'bg-muted/[0.08]', dot: 'bg-muted/[0.16]', text: 'text-muted dark:text-muted-night' },
} as const;

/**
 * Notifications (maquette « Notifications — Liste » et « État · Vide ») :
 * « Aujourd'hui », « Cette semaine », « Plus tôt » ; une ligne teintée
 * tant qu'elle n'est pas lue ; la toucher la marque lue et ouvre ce dont
 * elle parle. « Tout marquer comme lu » en haut.
 */
export default function NotificationsScreen() {
  const { t } = useTranslation('social');
  const queryClient = useQueryClient();
  const list = useNotifications();
  const [pulling, setPulling] = useState(false);
  const { refetch } = list;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const all = list.data?.pages.flatMap((p) => p.notifications) ?? [];
  const unread = list.data?.pages[0]?.unread ?? 0;
  const sections = group(all);

  const open = (n: AppNotification) => {
    if (!n.read) void markRead(queryClient, n.id).catch(() => undefined);
    const target = targetOf(n);
    if (target) router.push(target);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView
        contentContainerClassName="gap-6 pb-12 pt-5"
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={async () => { setPulling(true); await refetch(); setPulling(false); }} />}
        onScrollEndDrag={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}>
        <View className="flex-row px-5">
          <BackButton />
        </View>
        <View className="px-5">
          <ScreenTitle title={t('notifications.title')} legend={list.data ? t('notifications.unread', { count: unread }) : ' '} />
        </View>

        <View className="flex-row items-center justify-between px-5">
          {unread > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => void markAllRead(queryClient)} hitSlop={8} className="active:opacity-70">
              <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">{t('notifications.readAll')}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable accessibilityRole="link" onPress={() => router.push('/notifications-reglages')} hitSlop={8} className="active:opacity-70">
            <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('notifications.settings')}</Text>
          </Pressable>
        </View>

        {list.isPending && <ActivityIndicator className="pt-8" />}
        {list.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{list.error.message}</Text>}
        {list.data && all.length === 0 && <EmptyState icon="search" title={t('notifications.emptyTitle')} text={t('notifications.emptyText')} />}

        {sections.map(([key, rows]) => (
          <View key={key} className="gap-3">
            <Text accessibilityRole="header" className="px-5 font-luciole-bold text-body text-ink dark:text-ink-night">
              {t(`notifications.section.${key}`)}
            </Text>
            {rows.map((n) => (
              <Row key={n.id} n={n} onPress={() => open(n)} />
            ))}
          </View>
        ))}
        {list.isFetchingNextPage && <ActivityIndicator />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ n, onPress }: { n: AppNotification; onPress: () => void }) {
  const { t } = useTranslation('social');
  const tone = TONE[toneOf(n)];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n.read ? '' : t('notifications.unreadA11y')}${n.title}. ${n.body ?? ''}`}
      onPress={onPress}
      style={n.read ? E1 : undefined}
      className={`mx-5 flex-row gap-3 rounded-md px-3 py-3 active:opacity-80 ${n.read ? 'bg-surface dark:bg-surface-night' : tone.row}`}>
      <View className={`h-10 w-10 items-center justify-center rounded-full ${tone.dot}`}>
        <Text className={`font-luciole-bold text-body ${tone.text}`}>{n.title.charAt(0)}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text className="flex-1 font-luciole-bold text-body text-ink dark:text-ink-night">{n.title}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{since(n.createdAt)}</Text>
        </View>
        {n.body ? <Text className="font-luciole text-legend text-muted dark:text-muted-night">{n.body}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Aujourd'hui, cette semaine (7 jours), plus tôt. */
function group(all: AppNotification[]): [string, AppNotification[]][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week = today.getTime() - 6 * 86_400_000;
  const out: Record<string, AppNotification[]> = { today: [], week: [], earlier: [] };
  for (const n of all) {
    const at = new Date(n.createdAt).getTime();
    out[at >= today.getTime() ? 'today' : at >= week ? 'week' : 'earlier'].push(n);
  }

  return (['today', 'week', 'earlier'] as const).filter((k) => out[k].length > 0).map((k) => [k, out[k]]);
}
