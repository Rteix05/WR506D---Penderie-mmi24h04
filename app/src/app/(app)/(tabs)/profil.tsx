import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileCard } from '@/components/profiles/ProfileCard';
import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { logout } from '@/lib/api';
import { forgetPushToken } from '@/lib/push';
import { useMe } from '@/lib/auth';
import { useAccountProfiles } from '@/lib/profiles';

/**
 * « Mon profil » (entrée du panneau Profil) : le profil actif, les autres
 * profils du compte (un compte ouvre plusieurs profils : toi, tes enfants,
 * les proches que tu gères ; tout ce que l'app affiche dépend du profil
 * actif), puis le compte et la déconnexion (la langue est dans Paramètres).
 *
 * « Changer de profil » ouvre l'écran de la maquette (Compte — Changer de
 * profil) ; chaque profil ouvre sa fiche (Compte — Profil famille). Les
 * autres entrées du panneau (amis, partages, ventes, paramètres) auront
 * leurs propres pages.
 */
export default function ProfileScreen() {
  const { t } = useTranslation('profiles');
  const me = useMe();
  const profiles = useAccountProfiles();
  // Ce téléphone cesse de recevoir les push du compte, puis on se déconnecte.
  const signOut = useMutation({ mutationFn: async () => { await forgetPushToken(); await logout(); } });
  const active = profiles.data?.find((p) => p.active);
  const others = profiles.data?.filter((p) => !p.active) ?? [];
  const open = (id: string) => router.push({ pathname: '/profils/[id]', params: { id } });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6">
        <ScreenTitle title={t('tab.title')} legend={t('tab.legend')} />

        <View className="gap-3">
          <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
            {t('tab.active')}
          </Text>
          {profiles.isPending && <ActivityIndicator />}
          {profiles.isError && <Text className="font-luciole text-body text-error dark:text-error-night">{profiles.error.message}</Text>}
          {active && <ProfileCard profile={active} onPress={() => open(active.id)} />}
          <Button label={t('tab.change')} variant="secondary" onPress={() => router.push('/profils')} />
        </View>

        {profiles.data && (
          <View className="gap-3">
            <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
              {t('tab.family')}
            </Text>
            {others.length === 0 && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('tab.addHint')}</Text>}
            {others.map((p) => (
              <ProfileCard key={p.id} profile={p} onPress={() => open(p.id)} />
            ))}
            {active?.type === 'ADULT' && <Button label={t('tab.add')} glyph="+" variant="secondary" onPress={() => router.push('/profils/nouveau')} />}
          </View>
        )}

        <View className="gap-3">
          {me.data && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('tab.account', { email: me.data.account.email })}</Text>}
          <Button label={t('tab.logout')} variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
