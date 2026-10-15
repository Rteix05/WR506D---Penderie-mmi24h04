import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileCard } from '@/components/profiles/ProfileCard';
import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { logout } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useAccountProfiles } from '@/lib/profiles';

/**
 * « Mon profil » (entrée du panneau Profil) : le profil actif, les autres
 * profils du compte (un compte ouvre plusieurs profils : toi, tes enfants,
 * les proches que tu gères ; tout ce que l'app affiche dépend du profil
 * actif), puis le compte et la déconnexion.
 *
 * « Changer de profil » ouvre l'écran de la maquette (Compte — Changer de
 * profil) ; chaque profil ouvre sa fiche (Compte — Profil famille). Les
 * autres entrées du panneau (amis, partages, ventes, paramètres) auront
 * leurs propres pages.
 */
export default function ProfileScreen() {
  const me = useMe();
  const profiles = useAccountProfiles();
  const signOut = useMutation({ mutationFn: logout });
  const active = profiles.data?.find((p) => p.active);
  const others = profiles.data?.filter((p) => !p.active) ?? [];
  const open = (id: string) => router.push({ pathname: '/profils/[id]', params: { id } });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6">
        <ScreenTitle title="Mon profil" legend="Informations et profils de la famille" />

        <View className="gap-3">
          <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
            Profil actif
          </Text>
          {profiles.isPending && <ActivityIndicator />}
          {profiles.isError && <Text className="font-luciole text-body text-error dark:text-error-night">{profiles.error.message}</Text>}
          {active && <ProfileCard profile={active} onPress={() => open(active.id)} />}
          <Button label="Changer de profil" variant="secondary" onPress={() => router.push('/profils')} />
        </View>

        {profiles.data && (
          <View className="gap-3">
            <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
              Profils de la famille
            </Text>
            {others.length === 0 && (
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">
                Ajoute un profil pour tes enfants ou un proche : chacun aura sa penderie.
              </Text>
            )}
            {others.map((p) => (
              <ProfileCard key={p.id} profile={p} onPress={() => open(p.id)} />
            ))}
            {active?.type === 'ADULT' && <Button label="Ajouter un profil" glyph="+" variant="secondary" onPress={() => router.push('/profils/nouveau')} />}
          </View>
        )}

        <View className="gap-3">
          {me.data && <Text className="font-luciole text-legend text-muted dark:text-muted-night">Compte : {me.data.account.email}</Text>}
          <Button label="Se déconnecter" testID="logout" variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
