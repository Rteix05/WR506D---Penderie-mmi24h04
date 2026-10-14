import { Pressable, Text, View } from 'react-native';

import { E1 } from '@/components/ui/elevation';
import { profileMeta, type AccountProfile } from '@/lib/profiles';

/**
 * Avatar d'un profil. La maquette montre une photo ; l'API n'a pas encore
 * d'avatar (Profile.avatarMedia n'est pas exposé) : on met l'initiale,
 * comme la barre haute de l'accueil.
 */
export function ProfileAvatar({ name, size = 48, strong = false }: { name: string; size?: number; strong?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }} className={`items-center justify-center ${strong ? 'bg-primary' : 'bg-cloth-light'}`}>
      <Text style={{ fontSize: size * 0.4 }} className={`font-luciole-bold ${strong ? 'text-white' : 'text-cloth'}`}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * Carte d'un profil (Figma « Compte — Changer de profil ») : avatar, nom en
 * gras, « Profil enfant · 9 ans · 18 objets », et à droite le badge
 * « Actif » ou un chevron.
 */
export function ProfileCard({ profile, selected, onPress, aside }: { profile: AccountProfile; selected?: boolean; onPress: () => void; aside?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-selected={selected}
      accessibilityLabel={`${profile.displayName}, ${profileMeta(profile)}${profile.active ? ', actif' : ''}`}
      onPress={onPress}
      style={E1}
      className={`min-h-[72px] flex-row items-center gap-4 rounded-md px-4 py-3 active:opacity-80 ${selected ? 'border-2 border-primary bg-primary/[0.06]' : 'bg-surface dark:bg-surface-night'}`}>
      <ProfileAvatar name={profile.displayName} strong={selected} />
      <View className="flex-1 gap-0.5">
        <Text className="font-luciole-bold text-[18px] text-ink dark:text-ink-night">{profile.displayName}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{profileMeta(profile)}</Text>
      </View>
      {profile.active ? (
        <View className="rounded-full bg-main-tint px-2 py-1 dark:bg-main-night/15">
          <Text className="font-luciole-bold text-legend text-[#10786B] dark:text-main-night">Actif</Text>
        </View>
      ) : (
        <Text className="font-luciole-bold text-body text-muted dark:text-muted-night">{aside ?? '>'}</Text>
      )}
    </Pressable>
  );
}
