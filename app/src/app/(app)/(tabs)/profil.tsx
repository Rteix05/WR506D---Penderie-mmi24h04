import { useMutation } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { E1 } from '@/components/ui/elevation';
import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { logout } from '@/lib/api';
import { useMe, useSwitchProfile, type MeProfile, type ProfileType } from '@/lib/auth';

const TYPE_LABEL: Record<ProfileType, string> = {
  ADULT: 'Adulte',
  CHILD: 'Enfant',
  RELATIVE: 'Proche',
};

/**
 * « Mon profil » (entrée du panneau Profil) : le sélecteur de profil — un
 * compte ouvre plusieurs profils (toi, tes enfants, un proche) et tout ce
 * que l'app affiche dépend du profil actif —, le compte et la déconnexion.
 * Les autres entrées du panneau (amis, partages, ventes, paramètres)
 * auront leurs propres pages.
 */
export default function ProfileScreen() {
  const me = useMe();
  const switchProfile = useSwitchProfile();
  const signOut = useMutation({ mutationFn: logout });
  const select = useMutation({ mutationFn: switchProfile });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6">
        <ScreenTitle title="Mon profil" legend="Informations et profils de la famille" />

        <View className="gap-3">
          <Text accessibilityRole="header" className="text-body font-luciole-bold text-ink dark:text-ink-night">
            Profil actif
          </Text>
          {me.isPending && <ActivityIndicator />}
          {me.isError && <Text className="font-luciole text-body text-error dark:text-error-night">{me.error.message}</Text>}
          {me.data && (
            <View accessibilityRole="radiogroup" className="gap-2">
              {me.data.profiles.map((profile) => (
                <ProfileOption
                  key={profile.id}
                  profile={profile}
                  active={profile.id === me.data.activeProfile}
                  disabled={select.isPending || profile.suspended}
                  onPress={() => select.mutate(profile.id)}
                />
              ))}
            </View>
          )}
          {me.data && <Text className="font-luciole text-legend text-muted dark:text-muted-night">Compte : {me.data.account.email}</Text>}
        </View>


        <Button label="Se déconnecter" variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileOption({ profile, active, disabled, onPress }: { profile: MeProfile; active: boolean; disabled: boolean; onPress: () => void }) {
  const details = [TYPE_LABEL[profile.type], `@${profile.username}`, profile.suspended ? 'suspendu' : null].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={`${profile.displayName}, ${details}`}
      onPress={active ? undefined : onPress}
      disabled={disabled}
      style={E1}
      className={`min-h-14 flex-row items-center gap-3 rounded-md px-4 py-3 ${active ? 'bg-primary/10' : 'bg-surface dark:bg-surface-night'} ${disabled && !active ? 'opacity-50' : ''}`}>
      <View className={`h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-primary' : 'bg-cloth-light'}`}>
        <Text className={`text-body font-luciole-bold ${active ? 'text-white' : 'text-cloth'}`}>{profile.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View className="flex-1 gap-1">
        <Text className={`text-body font-luciole-bold ${active ? 'text-primary dark:text-primary-night' : 'text-ink dark:text-ink-night'}`}>{profile.displayName}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{details}</Text>
      </View>
      {active && <Text className="text-legend font-luciole-bold text-primary dark:text-primary-night">Actif</Text>}
    </Pressable>
  );
}
