import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { FlowScreen } from '@/components/add/FlowScreen';
import { GarmentThumb, PostCard } from '@/components/feed/PostCard';
import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { Pill } from '@/components/ui/Banner';
import { BackButton } from '@/components/ui/BackButton';
import { E1 } from '@/components/ui/elevation';
import { Heading } from '@/components/ui/Heading';
import { useProfilePage, type MentionGarment, type ProfilePage } from '@/lib/feed';

/**
 * La page d'un profil vue par toi (d'après Figma « Amis — Profil ami »,
 * version simple) : qui c'est pour toi, les vêtements que ses
 * publications te montrent, puis ses publications. Ouverte depuis une
 * mention (paramètre « garment »), elle met ce vêtement en avant.
 */
export default function ProfilePageScreen() {
  const { id, garment } = useLocalSearchParams<{ id: string; garment?: string }>();
  const page = useProfilePage(id);

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton />
      </View>
      {page.isPending && <ActivityIndicator className="py-10" />}
      {page.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{page.error.message}</Text>}
      {page.data && <Body page={page.data} highlight={garment} />}
    </FlowScreen>
  );
}

function Body({ page, highlight }: { page: ProfilePage; highlight?: string }) {
  const { profile, relation } = page;
  const chips = [
    relation.self && 'C’est toi',
    relation.household && 'Ton foyer',
    relation.friend && 'Vous êtes amis',
    relation.following && 'Tu suis ce compte',
  ].filter((c): c is string => Boolean(c));
  // Le vêtement de la mention d'abord.
  const garments = [...page.garments].sort((a, b) => Number(b.id === highlight) - Number(a.id === highlight));

  return (
    <View className="gap-6 px-5">
      <View className="items-center gap-2">
        <ProfileAvatar name={profile.displayName} size={88} />
        <Heading level="h3" accessibilityRole="header" className="text-center uppercase text-ink dark:text-ink-night">
          {profile.displayName}
        </Heading>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">@{profile.username}</Text>
        {chips.length > 0 && (
          <View className="flex-row flex-wrap justify-center gap-2">
            {chips.map((c) => (
              <Pill key={c} label={c} />
            ))}
          </View>
        )}
        {profile.bio && <Text className="text-center font-luciole text-body text-ink dark:text-ink-night">{profile.bio}</Text>}
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
          {relation.self ? 'Ce que tu montres' : `Ce que ${profile.displayName} te montre`}
        </Text>
        {garments.length === 0 ? (
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">Aucun vêtement visible pour l&apos;instant.</Text>
        ) : (
          garments.map((g) => <GarmentRow key={g.id} garment={g} highlighted={g.id === highlight} self={relation.self} />)
        )}
        <View className="rounded-md bg-ink/[0.05] p-4 dark:bg-ink-night/[0.08]">
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">
            {relation.self ? 'Ces vêtements sont visibles par l’audience de tes publications.' : `Tu ne vois que ce que ${profile.displayName} a choisi de te montrer.`}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
          Publications
        </Text>
        {page.posts.length === 0 && <Text className="font-luciole text-legend text-muted dark:text-muted-night">Aucune publication visible.</Text>}
        {page.posts.map((p) => (
          <PostCard key={p.id} post={p} linked />
        ))}
      </View>
    </View>
  );
}

/** Un vêtement montré : ses détails en ligne ; le sien s'ouvre dans le dressing. */
function GarmentRow({ garment, highlighted, self }: { garment: MentionGarment; highlighted: boolean; self: boolean }) {
  const details = [garment.brand, garment.size ? `Taille ${garment.size}` : null, garment.colors?.join(', ')].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole={self ? 'button' : undefined}
      disabled={!self}
      onPress={() => router.push({ pathname: '/vetement/[id]', params: { id: garment.id } })}
      style={E1}
      className={`flex-row items-center gap-3 rounded-md bg-surface p-3 dark:bg-surface-night ${highlighted ? 'border-2 border-primary' : ''}`}>
      <GarmentThumb photo={garment.photo} size={56} />
      <View className="flex-1 gap-0.5">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{garment.name}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{garment.category}</Text>
        {details !== '' && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{details}</Text>}
      </View>
    </Pressable>
  );
}
