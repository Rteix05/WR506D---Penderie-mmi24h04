import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/inventory/EmptyState';
import { SectionHeader } from '@/components/places/Blocks';
import { BackButton } from '@/components/ui/BackButton';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { useActivity, type Activity } from '@/lib/activity';
import { useAccountProfiles } from '@/lib/profiles';

/** Couleur d'un chiffre : le langage des statuts de la charte (DS § 1). */
const TONE = {
  ink: 'text-ink dark:text-ink-night',
  lent: 'text-primary dark:text-primary-night', // « Prêté »
  borrowed: 'text-cloth dark:text-cloth-night', // « Emprunté »
  late: 'text-error dark:text-error-night', // « En retard »
  done: 'text-muted dark:text-muted-night', // « Terminé »
} as const;

/**
 * « Mon activité » (panneau Profil) : les chiffres du profil actif. Un écran
 * à part, ouvert à la demande : l'accueil reste sans tableau de bord
 * (principes UX, § 7).
 *
 * Chaque chiffre mène à ce qu'il compte (objets, dressing, prêts) ; les
 * couleurs sont celles des statuts (prêté, emprunté, en retard, terminé) ;
 * un profil sans rien propose de scanner son premier objet (§ 8). Les
 * chiffres se rafraîchissent au retour sur l'écran et en tirant vers le bas.
 */
export default function ActivityScreen() {
  const { t } = useTranslation('profiles');
  const activity = useActivity();
  const active = useAccountProfiles().data?.find((p) => p.active);
  const [pulling, setPulling] = useState(false);
  const { refetch } = activity;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const refresh = async () => {
    setPulling(true);
    await refetch();
    setPulling(false);
  };

  const a = activity.data;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-10 pt-5" refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} />}>
        <View className="flex-row px-5">
          <BackButton />
        </View>
        <View className="px-5">
          <ScreenTitle title={t('activity.title')} legend={active ? t('activity.legendNamed', { name: active.displayName }) : t('activity.legend')} />
        </View>

        {activity.isPending && <Skeleton />}

        {activity.isError && (
          <View className="gap-3">
            <Banner tone="error" title={t('activity.error')} text={activity.error.message} />
            <View className="self-center">
              <Button label={t('activity.retry')} variant="secondary" onPress={() => void refetch()} />
            </View>
          </View>
        )}

        {a && (isEmpty(a) ? <Empty /> : <Figures a={a} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function Figures({ a }: { a: Activity }) {
  const { t } = useTranslation('profiles');
  const go = (href: Href) => () => router.push(href);

  return (
    <View className="gap-8">
      {/* Inventaire : deux tuiles, qui ouvrent les objets et le dressing. */}
      <View className="gap-3">
        <SectionHeader title={t('activity.inventory.title')} />
        <View className="flex-row gap-3 px-5">
          <Tile value={a.inventory.items} label={t('activity.inventory.items', { count: a.inventory.items })} a11y={t('activity.inventory.itemsA11y', { count: a.inventory.items })} onPress={go('/objets')} />
          <Tile value={a.inventory.garments} label={t('activity.inventory.garments', { count: a.inventory.garments })} a11y={t('activity.inventory.garmentsA11y', { count: a.inventory.garments })} onPress={go('/dressing')} />
        </View>
        {a.inventory.addedThisMonth > 0 && (
          <Text className="px-5 font-luciole text-legend text-main dark:text-main-night">{t('activity.inventory.addedThisMonth', { count: a.inventory.addedThisMonth })}</Text>
        )}
      </View>

      {/* Prêts : les couleurs des statuts ; un retard passe en tête, en rouge. */}
      <View className="gap-3">
        <SectionHeader title={t('activity.loans.title')} aside={t('activity.loans.seeAll')} onAside={go('/prets')} />
        <Card>
          {a.loans.overdue > 0 && <Row label={t('activity.loans.overdue', { count: a.loans.overdue })} value={a.loans.overdue} tone="late" onPress={go('/prets')} />}
          <Row label={t('activity.loans.lent')} value={a.loans.lent} tone={a.loans.lent > 0 ? 'lent' : 'done'} onPress={go('/prets')} />
          <Row label={t('activity.loans.borrowed')} value={a.loans.borrowed} tone={a.loans.borrowed > 0 ? 'borrowed' : 'done'} onPress={go({ pathname: '/prets', params: { onglet: 'emprunts' } })} />
          <Row label={t('activity.loans.returned')} value={a.loans.returned} tone="done" />
        </Card>
      </View>

      {/* Ventes : pas encore d'écran dans l'app, les chiffres seuls. */}
      <View className="gap-3">
        <SectionHeader title={t('activity.sales.title')} />
        {a.sales.onSale + a.sales.sold + a.sales.bought === 0 ? (
          <Text className="px-5 font-luciole text-legend text-muted dark:text-muted-night">{t('activity.sales.none')}</Text>
        ) : (
          <Card>
            <Row label={t('activity.sales.onSale')} value={a.sales.onSale} />
            <Row label={t('activity.sales.sold')} value={a.sales.sold} tone="done" />
            <Row label={t('activity.sales.bought')} value={a.sales.bought} tone="done" />
          </Card>
        )}
      </View>

      {/* Scans : la part reconnue, en barre, et de quoi scanner tout de suite. */}
      <View className="gap-3">
        <SectionHeader title={t('activity.scans.title')} aside={t('activity.scans.scan')} onAside={go('/ajout/scan')} />
        {a.scans.rate === null ? (
          <Text className="px-5 font-luciole text-legend text-muted dark:text-muted-night">{t('activity.scans.none')}</Text>
        ) : (
          <Card>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={t('activity.scans.a11y', { rate: a.scans.rate, recognised: a.scans.recognised, total: a.scans.total })}
              accessibilityValue={{ min: 0, max: 100, now: a.scans.rate }}
              className="gap-2">
              <View className="flex-row items-baseline justify-between">
                <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('activity.scans.rate')}</Text>
                <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{t('activity.scans.percent', { rate: a.scans.rate })}</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-ink-night/10">
                <View className="h-2 rounded-full bg-main dark:bg-main-night" style={{ width: `${a.scans.rate}%` }} />
              </View>
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('activity.scans.detail', { recognised: a.scans.recognised, count: a.scans.total })}</Text>
            </View>
          </Card>
        )}
      </View>
    </View>
  );
}

function isEmpty(a: Activity): boolean {
  const { inventory: i, loans: l, sales: s, scans } = a;

  return i.items + i.garments + l.lent + l.borrowed + l.returned + s.onSale + s.sold + s.bought + scans.total === 0;
}

/** Rien encore : dire ce qu'on verra ici, et proposer le geste qui remplit (§ 8). */
function Empty() {
  const { t } = useTranslation('profiles');

  return (
    <EmptyState
      icon="hanger"
      title={t('activity.empty.title')}
      text={t('activity.empty.text')}
      action={{ label: t('activity.empty.action'), glyph: '[ ]', onPress: () => router.push('/ajout/scan') }}
    />
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <View style={E1} className="mx-5 gap-1 rounded-md bg-surface p-2 dark:bg-surface-night">
      {children}
    </View>
  );
}

/** Une tuile d'inventaire : le nombre en grand, le libellé dessous, toute la tuile ouvre la liste. */
function Tile({ value, label, a11y, onPress }: { value: number; label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={E1}
      className="flex-1 gap-1 rounded-md bg-surface p-4 active:opacity-80 dark:bg-surface-night">
      <Text className="font-typolio text-[32px] leading-[36px] text-ink dark:text-ink-night">{value}</Text>
      <View className="flex-row items-center justify-between">
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{label}</Text>
        <Text className="font-luciole-bold text-body text-muted/[0.85] dark:text-muted-night">›</Text>
      </View>
    </Pressable>
  );
}

/** Une ligne « libellé … chiffre » ; avec onPress, elle ouvre la liste (chevron). */
function Row({ label, value, tone = 'ink', onPress }: { label: string; value: number; tone?: keyof typeof TONE; onPress?: () => void }) {
  const content = (
    <>
      <Text className="flex-1 font-luciole text-body text-ink/70 dark:text-ink-night/70">{label}</Text>
      <Text className={`font-luciole-bold text-body ${TONE[tone]}`}>{value}</Text>
      {onPress && <Text className="w-3 font-luciole-bold text-body text-muted/[0.85] dark:text-muted-night">›</Text>}
    </>
  );

  return onPress ? (
    <Pressable accessibilityRole="link" accessibilityLabel={`${label} : ${value}`} onPress={onPress} className="min-h-[44px] flex-row items-center gap-3 rounded-sm px-2 active:bg-ink/[0.04]">
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${label} : ${value}`} className="min-h-[44px] flex-row items-center gap-3 px-2">
      {content}
      <View className="w-3" />
    </View>
  );
}

/** Pendant le chargement : la forme de l'écran, sans chiffres. */
function Skeleton() {
  const { t } = useTranslation('profiles');

  return (
    <View accessible accessibilityLabel={t('activity.loading')} className="gap-8 px-5">
      <View className="flex-row gap-3">
        <View className="h-[84px] flex-1 rounded-md bg-ink/[0.05] dark:bg-ink-night/[0.08]" />
        <View className="h-[84px] flex-1 rounded-md bg-ink/[0.05] dark:bg-ink-night/[0.08]" />
      </View>
      <View className="h-[150px] rounded-md bg-ink/[0.05] dark:bg-ink-night/[0.08]" />
      <View className="h-[100px] rounded-md bg-ink/[0.05] dark:bg-ink-night/[0.08]" />
    </View>
  );
}
