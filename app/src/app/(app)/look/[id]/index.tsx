import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { Dot, LookPhoto, type Outline } from '@/components/look/LookPhoto';
import { Pill } from '@/components/ui/Banner';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { addTag, confirmTag, deleteLook, isReady, LOOK_STATUS, MAX_TAGS, removeTag, tagLine, tagName, updateLook, useLook, type Look, type LookTag } from '@/lib/look';

/** « lundi 12 octobre » */
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Le look : la photo, un point par vêtement, et ce que l'IA a reconnu.
 *
 * En préparation, toucher un vêtement sur la photo y pose un point ; le
 * gros plan part à l'IA, qui répond en quelques secondes. Chaque point se
 * confirme (vêtement reconnu), s'ajoute au dressing (vêtement nouveau) ou
 * se désigne à la main. Quand tous les points désignent un vêtement, le
 * post peut se préparer.
 */
export default function LookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const look = useLook(id);

  return (
    <FlowScreen>
      <View className="flex-row items-center justify-between px-5">
        <BackButton />
        {look.data && <Pill label={LOOK_STATUS[look.data.status]} tone={look.data.status === 'TAGGING' ? 'primary' : 'main'} />}
      </View>
      <View className="px-5">
        <ScreenTitle title="Look du jour" legend={look.data ? dayLabel(look.data.wornOn) : undefined} />
      </View>
      {look.isPending && <ActivityIndicator className="py-10" />}
      {look.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{look.error.message}</Text>}
      {look.data && <LookBody look={look.data} />}
    </FlowScreen>
  );
}

function LookBody({ look }: { look: Look }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const tagging = look.status === 'TAGGING';
  const full = look.tags.length >= MAX_TAGS;
  const ready = isReady(look);

  const place = async (x: number, y: number) => {
    if (full) return;
    setError(null);
    setPending({ x, y });
    try {
      await addTag(queryClient, look, x, y);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le point n'a pas pu être analysé.");
    } finally {
      setPending(null);
    }
  };

  const move = async (status: Look['status']) => {
    setSaving(true);
    setError(null);
    try {
      await updateLook(queryClient, look.id, { status });
      if (status === 'READY') router.push({ pathname: '/look/[id]/post', params: { id: look.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le look n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert('Supprimer ce look ?', 'La photo et ses points disparaissent. Les vêtements restent dans ton dressing.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLook(queryClient, look.id);
            router.back();
          } catch (e) {
            Alert.alert('Suppression impossible', e instanceof Error ? e.message : '');
          }
        },
      },
    ]);

  const hint = !tagging
    ? 'Les points ne se modifient plus : repasse le look en préparation pour les changer.'
    : full
      ? `${MAX_TAGS} vêtements au plus par look.`
      : pending
        ? "L'IA regarde ce vêtement… (jusqu'à 30 secondes)"
        : look.tags.length === 0
          ? 'Touche un vêtement sur la photo pour y poser un point.'
          : 'Touche un autre vêtement pour ajouter un point.';

  return (
    <>
      <View className="gap-2 px-5">
        <LookPhoto look={look} onPlace={tagging && !full ? place : undefined} pending={pending} outlines={tagging ? outlinesOf(look) : []} />
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{hint}</Text>
      </View>

      {look.tags.length > 0 && (
        <View className="gap-3 px-5">
          <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
            {look.tags.length > 1 ? `${look.tags.length} vêtements` : '1 vêtement'}
          </Text>
          {look.tags.map((tag) => (
            <TagRow key={tag.id} look={look} tag={tag} editable={tagging} />
          ))}
        </View>
      )}

      <ActionBar note={tagging && look.tags.length > 0 && !ready ? 'Chaque point doit désigner un vêtement de ton dressing pour préparer le post.' : undefined}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        {tagging ? (
          <Button label="Préparer le post" onPress={() => move('READY')} disabled={!ready || Boolean(pending)} loading={saving} />
        ) : (
          <Button label="Voir le post" onPress={() => router.push({ pathname: '/look/[id]/post', params: { id: look.id } })} />
        )}
        {look.status === 'READY' && <Button label="Modifier les points" variant="secondary" onPress={() => move('TAGGING')} loading={saving} />}
        {look.status !== 'POSTED' && <Button label="Supprimer ce look" variant="ghost" onPress={remove} disabled={saving || Boolean(pending)} />}
      </ActionBar>
    </>
  );
}

/** Un point : son numéro, le vêtement (ou ce que l'IA a vu), et quoi faire. */
function TagRow({ look, tag, editable }: { look: Look; tag: LookTag; editable: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert('Action impossible', e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  };
  const choose = () => router.push({ pathname: '/look/[id]/choisir', params: { id: look.id, tag: tag.id } });
  const create = () => router.push({ pathname: '/ajout/look', params: { look: look.id, tag: tag.id } });
  const meta = tag.garment ? [tag.garment.brand, tag.garment.category].filter(Boolean).join(' · ') : tag.suggestion?.category?.name;

  return (
    <View style={E1} className="gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
      <View className="flex-row items-center gap-3">
        <Dot tag={tag} />
        <View className="flex-1 gap-0.5">
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{tagName(tag)}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{[tagLine(tag), meta].filter(Boolean).join(' · ')}</Text>
        </View>
        {busy && <ActivityIndicator />}
      </View>
      {editable && (
        <View className="flex-row flex-wrap gap-2">
          {tag.status === 'MATCHED' && tag.garment && <Chip label="Confirmer" strong onPress={() => run(() => confirmTag(queryClient, look.id, tag.id, tag.garment!['@id']))} disabled={busy} />}
          {tag.status === 'NEW' && <Chip label="Ajouter au dressing" strong onPress={create} disabled={busy} />}
          <Chip label={tag.status === 'CONFIRMED' ? 'Changer' : 'Choisir dans le dressing'} onPress={choose} disabled={busy} />
          {tag.status === 'UNKNOWN' && <Chip label="Nouveau vêtement" onPress={create} disabled={busy} />}
          <Chip label="Retirer" onPress={() => run(() => removeTag(queryClient, look.id, tag))} disabled={busy} />
        </View>
      )}
    </View>
  );
}

function Chip({ label, onPress, strong = false, disabled }: { label: string; onPress: () => void; strong?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      className={`h-9 items-center justify-center rounded-full px-4 active:opacity-80 ${strong ? 'bg-main' : 'bg-ink/[0.06] dark:bg-ink-night/[0.1]'} ${disabled ? 'opacity-50' : ''}`}>
      <Text className={`font-luciole-bold text-legend ${strong ? 'text-white' : 'text-ink dark:text-ink-night'}`}>{label}</Text>
    </Pressable>
  );
}

/** Le contour de chaque vêtement délimité par l'IA : on voit ce qu'elle a compris de chaque point. */
function outlinesOf(look: Look): Outline[] {
  return look.tags.flatMap((tag) => (tag.box ? [{ key: tag.id, box: tag.box, status: tag.status }] : []));
}
