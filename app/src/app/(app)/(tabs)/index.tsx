import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClothVisual, type ClothKind } from '@/components/home/ClothVisual';
import { useOpenAddMenu } from '@/components/nav/AddMenu';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { E1 } from '@/components/ui/elevation';
import { mediaSource } from '@/lib/api';
import { useActiveProfile } from '@/lib/auth';
import { relativeDay, useInventoryOverview, type RecentEntry } from '@/lib/inventory';
import { LOOK_STATUS, useTodayLook } from '@/lib/look';
import { useUnreadCount } from '@/lib/notifications';

/**
 * Accueil — Tableau de bord, d'après Figma (page « Maquette v2 », node
 * 135:1797) : barre haute (marque, notifications, avatar), salutation et
 * compteurs, Scanner / Ajouter, aperçus Inventaire et Dressing, derniers
 * ajouts.
 *
 * Données réelles : compteurs et derniers ajouts viennent de l'API. Les
 * sections « Prêts en cours », « Tenues suggérées » et le lien vers la
 * penderie des amis attendent leurs routes d'API ; elles apparaîtront avec
 * elles, plutôt que d'afficher des données d'exemple.
 */
export default function HomeScreen() {
  const { t } = useTranslation('home');
  const profile = useActiveProfile();
  const overview = useInventoryOverview();
  const openAdd = useOpenAddMenu();
  const counts = overview.data
    ? t('counts.summary', {
        items: t('counts.items', { count: overview.data.items }),
        garments: t('counts.garments', { count: overview.data.garments }),
      })
    : ' ';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-14">
        <TopBar initial={profile?.displayName.charAt(0).toUpperCase() ?? ''} />

        <View className="gap-1 px-5">
          <Heading level="h3" accessibilityRole="header" className="uppercase text-ink dark:text-ink-night">
            {profile ? t('dashboard.greeting', { name: profile.displayName }) : t('dashboard.greetingAnon')}
          </Heading>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{counts}</Text>
        </View>

        <View className="flex-row gap-3 px-5">
          <View className="flex-1">
            <Button glyph="[ ]" label={t('dashboard.scan')} onPress={() => router.push('/ajout/scan')} />
          </View>
          <View className="flex-1">
            <Button glyph="+" label={t('dashboard.add')} variant="secondary" onPress={openAdd} />
          </View>
        </View>

        <LookCard />

        <View className="flex-row gap-3 px-5">
          <Preview title={t('dashboard.inventory')} meta={overview.data ? t('counts.items', { count: overview.data.items }) : ' '} tint="bg-primary/[0.08]" art={['baskets', 'casquette', 'pantalon', 'veste']} onPress={() => router.navigate('/objets')} />
          <Preview title={t('dashboard.dressing')} meta={overview.data ? t('counts.garments', { count: overview.data.garments }) : ' '} tint="bg-cloth/[0.08]" art={['tshirt', 'veste', 'robe', 'casquette']} onPress={() => router.navigate('/dressing')} />
        </View>

        <View className="gap-3">
          <Text accessibilityRole="header" className="px-5 font-luciole-bold text-body text-ink dark:text-ink-night">
            {t('dashboard.recent')}
          </Text>
          {overview.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{overview.error.message}</Text>}
          {overview.data && overview.data.recent.length === 0 && (
            <View style={E1} className="mx-5 gap-1 rounded-md bg-surface p-4 dark:bg-surface-night">
              <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{t('dashboard.emptyTitle')}</Text>
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('dashboard.emptyBody')}</Text>
            </View>
          )}
          {overview.data && overview.data.recent.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5 pb-1">
              {overview.data.recent.map((entry) => (
                <RecentCard key={entry.id} entry={entry} />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Barre haute (Figma « Barre haute ») : logo 28 + PENDERIE, puis « ! » et l'avatar, ronds de 36. */
function TopBar({ initial }: { initial: string }) {
  const { t } = useTranslation('home');

  return (
    <View className="h-14 flex-row items-center justify-between px-5">
      <View className="flex-row items-center gap-2">
        <Image source={require('@/assets/images/logo.png')} style={{ width: 28, height: 25.73 }} contentFit="contain" accessible={false} />
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">PENDERIE</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <NotificationButton />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('topBar.profile')}
          onPress={() => router.navigate('/profil')}
          hitSlop={4}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary/[0.12] active:opacity-80">
          <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">{initial}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** « ! » de la barre haute : ouvre les notifications ; pastille rose du nombre de non lues (DS : Badge / Count). */
function NotificationButton() {
  const { t } = useTranslation('home');
  const unread = useUnreadCount().data ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('topBar.notificationsUnread', { count: unread }) : t('topBar.notifications')}
      onPress={() => router.push('/notifications')}
      hitSlop={4}
      style={E1}
      className="h-9 w-9 items-center justify-center rounded-full bg-surface active:opacity-80 dark:bg-surface-night">
      <Text className="font-luciole-bold text-[14px] text-ink dark:text-ink-night">!</Text>
      {unread > 0 && (
        <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1">
          <Text className="font-luciole-bold text-[11px] text-white">{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Le look du jour (hors maquette : la fonctionnalité est venue après) :
 * l'invitation à prendre la photo, puis où en est le look du jour.
 */
function LookCard() {
  const { t } = useTranslation('home');
  const today = useTodayLook();
  const look = today.data;
  const pending = look ? look.tags.filter((t) => t.status !== 'CONFIRMED').length : 0;
  const text = !look
    ? t('look.empty')
    : look.status !== 'TAGGING'
      ? `${LOOK_STATUS[look.status]} · ${t('counts.garments', { count: look.tags.length })}`
      : look.tags.length === 0
        ? t('look.tagging')
        : pending > 0
          ? t('look.toCheck', { count: pending })
          : t('look.allChecked');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('look.accessibilityLabel', { text })}
      onPress={() => router.push(look ? { pathname: '/look/[id]', params: { id: look.id } } : '/look')}
      style={E1}
      className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-3 active:opacity-80 dark:bg-surface-night">
      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-xs bg-cloth/[0.08]">
        {look ? <Image source={mediaSource(look.photo.url)} style={{ width: 56, height: 56 }} contentFit="cover" accessible={false} /> : <ClothVisual kind="veste" />}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{t('look.title')}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{text}</Text>
      </View>
      <Text className="font-luciole-bold text-body text-muted dark:text-muted-night">{'>'}</Text>
    </Pressable>
  );
}

/** Carte d'aperçu (Figma « Card/Apercu ») : mosaïque 2 × 2 de vignettes de 63, titre et compteur. */
function Preview({ title, meta, tint, art, onPress }: { title: string; meta: string; tint: string; art: ClothKind[]; onPress: () => void }) {
  const tile = (kind: ClothKind, i: number) => (
    <View key={i} className={`h-[63px] w-[63px] items-center justify-center overflow-hidden rounded-xs ${tint}`}>
      <ClothVisual kind={kind} />
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}`}
      onPress={onPress}
      style={E1}
      className="flex-1 gap-3 rounded-md bg-surface p-3 active:opacity-80 dark:bg-surface-night">
      <View className="gap-1.5">
        <View className="flex-row gap-1.5">{art.slice(0, 2).map(tile)}</View>
        <View className="flex-row gap-1.5">{art.slice(2, 4).map((k, i) => tile(k, i + 2))}</View>
      </View>
      <View className="gap-0.5 pl-1">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{title}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{meta}</Text>
      </View>
    </Pressable>
  );
}

/** Carte d'objet (Figma « Card/Object ») : 140 de large, vignette 124 × 162 (la photo, sinon l'illustration), nom, pièce, date. */
function RecentCard({ entry }: { entry: RecentEntry }) {
  const when = relativeDay(entry.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[entry.name, entry.room, when].filter(Boolean).join(', ')}
      onPress={() => router.push({ pathname: entry.kind === 'item' ? '/objet/[id]' : '/vetement/[id]', params: { id: entry.id } })}
      style={E1}
      className="w-[140px] gap-2 rounded-md bg-surface px-2 pb-3 pt-2 active:opacity-80 dark:bg-surface-night">
      <View className={`h-[162px] w-[124px] items-center justify-center overflow-hidden rounded-sm ${entry.kind === 'garment' ? 'bg-cloth/[0.08]' : 'bg-primary/[0.08]'}`}>
        {entry.photo ? (
          <Image source={mediaSource(entry.photo)} style={{ width: 124, height: 162 }} contentFit="cover" accessible={false} />
        ) : (
          <ClothVisual kind={entry.kind === 'garment' ? 'tshirt' : 'baskets'} scale={1.968} />
        )}
      </View>
      <View className="gap-0.5 px-1">
        <Text numberOfLines={1} className="font-luciole-bold text-legend text-ink dark:text-ink-night">
          {entry.name}
        </Text>
        {entry.room && (
          <Text numberOfLines={1} className="font-luciole text-legend text-muted dark:text-muted-night">
            {entry.room}
          </Text>
        )}
        <Text className="font-luciole text-legend text-muted/[0.60] dark:text-muted-night/[0.60]">{when}</Text>
      </View>
    </Pressable>
  );
}
