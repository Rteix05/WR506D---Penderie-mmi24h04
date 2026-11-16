import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { FlowScreen } from '@/components/add/FlowScreen';
import { BackButton } from '@/components/ui/BackButton';
import { InfoCard } from '@/components/ui/InfoCard';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { useActivity } from '@/lib/activity';

/**
 * « Mon activité » (entrée du panneau Profil) : les chiffres du profil
 * actif — inventaire, prêts, ventes, scans. Un écran à part, ouvert à la
 * demande : l'accueil, lui, reste sans tableau de bord (principes UX, § 7).
 */
export default function ActivityScreen() {
  const { t } = useTranslation('profiles');
  const activity = useActivity();
  const a = activity.data;
  const n = (value: number) => String(value);

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title={t('activity.title')} legend={t('activity.legend')} />
      </View>

      {activity.isPending && <ActivityIndicator />}
      {activity.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{activity.error.message}</Text>}

      {a && (
        <View className="gap-4">
          <InfoCard
            title={t('activity.inventory.title')}
            rows={[
              [t('activity.inventory.items'), n(a.inventory.items)],
              [t('activity.inventory.garments'), n(a.inventory.garments)],
              [t('activity.inventory.addedThisMonth'), n(a.inventory.addedThisMonth)],
            ]}
          />
          <InfoCard
            title={t('activity.loans.title')}
            rows={[
              [t('activity.loans.lent'), n(a.loans.lent)],
              [t('activity.loans.overdue'), a.loans.overdue > 0 ? n(a.loans.overdue) : null],
              [t('activity.loans.borrowed'), n(a.loans.borrowed)],
              [t('activity.loans.returned'), n(a.loans.returned)],
            ]}
          />
          <InfoCard
            title={t('activity.sales.title')}
            rows={[
              [t('activity.sales.onSale'), n(a.sales.onSale)],
              [t('activity.sales.sold'), n(a.sales.sold)],
              [t('activity.sales.bought'), n(a.sales.bought)],
            ]}
          />
          <InfoCard
            title={t('activity.scans.title')}
            rows={[
              [t('activity.scans.total'), n(a.scans.total)],
              [t('activity.scans.rate'), a.scans.rate === null ? t('activity.scans.none') : t('activity.scans.percent', { rate: a.scans.rate })],
            ]}
          />
        </View>
      )}
    </FlowScreen>
  );
}
