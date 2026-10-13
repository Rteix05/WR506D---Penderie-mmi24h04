import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { Illustration } from '@/components/inventory/PossessionCard';
import { Dot, LookPhoto, type PhotoTag } from '@/components/look/LookPhoto';
import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { Pill } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { mediaSource } from '@/lib/api';
import { AUDIENCE, since, type Mention, type Post } from '@/lib/feed';

/** Les mentions d'une publication, au format des points de la photo. */
const asTags = (mentions: Mention[]): PhotoTag[] => mentions.map((m) => ({ id: String(m.position), x: m.x, y: m.y, position: m.position, status: 'CONFIRMED' }));

/**
 * Une publication du fil (Figma « Fil — Fil d'actualité ») : l'auteur et
 * la date, la pastille d'audience, le texte, puis la photo du look. Ses
 * points sont des MENTIONS : les toucher ouvre le vêtement (MentionSheet).
 * Dans le fil, la carte entière mène à la publication.
 */
export function PostCard({ post, linked = false }: { post: Post; linked?: boolean }) {
  const [open, setOpen] = useState<Mention | null>(null);
  const mentions = post.look?.tags ?? [];
  const audience = post.audience === 'SPECIFIC' ? 'Personnes choisies' : AUDIENCE[post.audience].chip;

  return (
    <View style={E1} className="gap-3 rounded-lg bg-surface p-4 dark:bg-surface-night">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Profil de ${post.author.displayName}`}
        onPress={() => router.push({ pathname: '/fil/profil/[id]', params: { id: post.author.id } })}
        className="flex-row items-center gap-3 active:opacity-80">
        <ProfileAvatar name={post.author.displayName} size={40} />
        <View className="flex-1">
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{post.author.displayName}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{since(post.publishedAt)}</Text>
        </View>
      </Pressable>
      <View className="flex-row">
        <Pill label={audience} tone={post.audience === 'FRIENDS' ? 'main' : 'primary'} />
      </View>
      {post.body && <Text className="font-luciole text-body text-ink dark:text-ink-night">{post.body}</Text>}

      {post.photo && (
        <LookPhoto
          look={{ photo: post.photo, tags: asTags(mentions) }}
          onTagPress={(tag) => setOpen(mentions.find((m) => m.position === tag.position) ?? null)}
          tagLabel={(tag) => `Vêtement ${tag.position + 1} : ${mentions.find((m) => m.position === tag.position)?.garment.name ?? ''}`}
        />
      )}
      {mentions.length > 0 && (
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">
          {mentions.length > 1 ? `${mentions.length} vêtements mentionnés : touche un point.` : '1 vêtement mentionné : touche le point.'}
        </Text>
      )}

      {linked && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/fil/[id]', params: { id: post.id } })}
          hitSlop={8}
          className="self-end active:opacity-80">
          <Text className="font-luciole-bold text-legend text-ink dark:text-ink-night">Voir la publication ›</Text>
        </Pressable>
      )}

      <MentionSheet mention={open} post={post} onClose={() => setOpen(null)} />
    </View>
  );
}

/** La liste numérotée des vêtements mentionnés (la 2e image du post, sur la page d'une publication). */
export function MentionList({ post }: { post: Post }) {
  const [open, setOpen] = useState<Mention | null>(null);
  const mentions = post.look?.tags ?? [];
  if (mentions.length === 0) return null;

  return (
    <View style={E1} className="gap-3 rounded-lg bg-surface p-4 dark:bg-surface-night">
      <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
        Les vêtements du look
      </Text>
      {mentions.map((m) => (
        <Pressable key={m.position} accessibilityRole="button" onPress={() => setOpen(m)} className="flex-row items-center gap-3 active:opacity-80">
          <Dot tag={{ position: m.position, status: 'CONFIRMED' }} />
          <GarmentThumb photo={m.garment.photo} />
          <View className="flex-1">
            <Text numberOfLines={1} className="font-luciole-bold text-body text-ink dark:text-ink-night">
              {m.garment.name}
            </Text>
            <Text numberOfLines={1} className="font-luciole text-legend text-muted dark:text-muted-night">
              {[m.garment.brand, m.garment.category].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text className="font-luciole-bold text-body text-muted dark:text-muted-night">›</Text>
        </Pressable>
      ))}
      <MentionSheet mention={open} post={post} onClose={() => setOpen(null)} />
    </View>
  );
}

export function GarmentThumb({ photo, size = 48 }: { photo?: string | null; size?: number }) {
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center overflow-hidden rounded-xs bg-cloth/[0.08]">
      {photo ? <Image source={mediaSource(photo)} style={{ width: size, height: size }} contentFit="cover" accessible={false} /> : <Illustration kind="tshirt" scale={size / 54} />}
    </View>
  );
}

/**
 * La mention d'un vêtement, comme un tag Instagram : son nom toujours ; ses
 * détails et « Voir sur le profil » seulement si la publication te le
 * montre (sinon, il reste privé).
 */
function MentionSheet({ mention, post, onClose }: { mention: Mention | null; post: Post; onClose: () => void }) {
  const garment = mention?.garment;
  const mine = post.canDelete;
  const details = garment ? [garment.brand, garment.size ? `Taille ${garment.size}` : null, garment.colors?.join(', ')].filter(Boolean).join(' · ') : '';

  const open = () => {
    if (!garment) return;
    onClose();
    if (mine) {
      router.push({ pathname: '/vetement/[id]', params: { id: garment.id } });
    } else {
      router.push({ pathname: '/fil/profil/[id]', params: { id: post.author.id, garment: garment.id } });
    }
  };

  return (
    <Modal visible={mention !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Fermer" onPress={onClose} className="flex-1 bg-ink/40" />
      {mention && garment && (
        <View className="gap-4 rounded-t-lg bg-bg px-5 pb-10 pt-5 dark:bg-bg-night">
          <View className="flex-row items-center gap-3">
            <Dot tag={{ position: mention.position, status: 'CONFIRMED' }} />
            <GarmentThumb photo={garment.photo} size={56} />
            <View className="flex-1 gap-0.5">
              <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
                {garment.name}
              </Text>
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">{garment.category}</Text>
              {details !== '' && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{details}</Text>}
            </View>
          </View>
          {garment.canView ? (
            <Button label={mine ? 'Voir dans mon dressing' : `Voir sur le profil de ${post.author.displayName}`} onPress={open} />
          ) : (
            <Text className="font-luciole text-legend text-muted dark:text-muted-night">{post.author.displayName} ne te montre pas ce vêtement : il reste privé.</Text>
          )}
          <Button label="Fermer" variant="ghost" onPress={onClose} />
        </View>
      )}
    </Modal>
  );
}
