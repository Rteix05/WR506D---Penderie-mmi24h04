import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/BackButton';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { activeProfileId, apiGet, apiRequest } from '@/lib/api';

type Group = { group: 'social' | 'loans' | 'sales' | 'family' | 'moderation'; push: boolean };

/**
 * « Régler mes notifications » (maquette) : le push par famille, pour le
 * profil actif. Les notifications restent toujours dans l'app ; seul
 * l'envoi sur le téléphone se coupe.
 */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation('social');
  const queryClient = useQueryClient();
  const key = ['notification-preferences', activeProfileId()];
  const prefs = useQuery({ queryKey: key, queryFn: async ({ signal }) => (await apiGet<{ groups: Group[] }>('/api/notification-preferences', signal)).groups });

  const toggle = async (group: Group['group'], push: boolean) => {
    queryClient.setQueryData<Group[]>(key, (list) => list?.map((g) => (g.group === group ? { ...g, push } : g)));
    const { groups } = await apiRequest<{ groups: Group[] }>('/api/notification-preferences', { method: 'PUT', body: { group, push }, accept: 'application/json' });
    queryClient.setQueryData(key, groups);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <View className="gap-6 pt-5">
        <View className="flex-row px-5">
          <BackButton />
        </View>
        <View className="px-5">
          <ScreenTitle title={t('pushSettings.title')} legend={t('pushSettings.legend')} />
        </View>
        {prefs.isPending && <ActivityIndicator />}
        {prefs.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{prefs.error.message}</Text>}
        <View style={E1} className="mx-5 rounded-md bg-surface px-4 dark:bg-surface-night">
          {prefs.data?.map((g, i) => (
            <View key={g.group} className={`min-h-[64px] flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-ink/[0.06] dark:border-ink-night/10' : ''}`}>
              <View className="flex-1">
                <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{t(`pushSettings.group.${g.group}.title`)}</Text>
                <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t(`pushSettings.group.${g.group}.detail`)}</Text>
              </View>
              <Switch accessibilityLabel={t(`pushSettings.group.${g.group}.title`)} value={g.push} onValueChange={(v) => void toggle(g.group, v)} />
            </View>
          ))}
        </View>
        <Text className="px-5 font-luciole text-legend text-muted dark:text-muted-night">{t('pushSettings.note')}</Text>
      </View>
    </SafeAreaView>
  );
}
