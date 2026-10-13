import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { Illustration } from '@/components/inventory/PossessionCard';
import { Dot, LookPhoto } from '@/components/look/LookPhoto';
import { BackButton } from '@/components/ui/BackButton';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { TextField } from '@/components/ui/TextField';
import { mediaSource } from '@/lib/api';
import { updateLook, useLook, type Look } from '@/lib/look';

/** Marge de l'écran (Figma : 20 de chaque côté). */
const GUTTER = 20;

/**
 * Le post Instagram du look, en 2 images : la photo avec ses points
 * numérotés, puis la liste des vêtements avec les mêmes numéros. L'app ne
 * publie pas : on poste ces images sur Instagram, puis on marque le look
 * comme posté (état POSTED côté API).
 */
export default function LookPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const look = useLook(id);

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title="Ton post" legend="2 images pour Instagram" />
      </View>
      {look.isPending && <ActivityIndicator className="py-10" />}
      {look.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{look.error.message}</Text>}
      {look.data && <PostBody look={look.data} />}
    </FlowScreen>
  );
}

function PostBody({ look }: { look: Look }) {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const slide = width - GUTTER * 2;
  const [page, setPage] = useState(0);
  const [caption, setCaption] = useState(look.caption ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posted = look.status === 'POSTED';

  const save = async (patch: Parameters<typeof updateLook>[2]) => {
    setSaving(true);
    setError(null);
    try {
      await updateLook(queryClient, look.id, patch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le look n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };
  const captionChanged = caption.trim() !== (look.caption ?? '');

  return (
    <>
      {posted ? (
        <Banner tone="success" title="Look posté !" text={look.postedAt ? `Le ${new Date(look.postedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.` : undefined} />
      ) : (
        <Banner tone="info" title="Prêt à poster" text="Publie ces 2 images sur Instagram, puis marque le look comme posté. Tu peux aussi le montrer à tes amis dans Penderie." />
      )}

      <View className="gap-3">
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={slide + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (slide + 12)))}>
          <View style={{ width: slide }} accessibilityLabel="Image 1 sur 2 : ta photo">
            <LookPhoto look={look} />
          </View>
          <View style={[{ width: slide }, E1]} accessibilityLabel="Image 2 sur 2 : tes vêtements" className="gap-3 rounded-lg bg-surface p-4 dark:bg-surface-night">
            <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">Mon look du jour</Text>
            {look.tags.map((tag) => (
              <View key={tag.id} className="flex-row items-center gap-3">
                <Dot tag={tag} />
                <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-xs bg-cloth/[0.08]">
                  {tag.garment?.photo ? (
                    <Image source={mediaSource(tag.garment.photo)} style={{ width: 48, height: 48 }} contentFit="cover" accessible={false} />
                  ) : (
                    <Illustration kind="tshirt" scale={0.9} />
                  )}
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-luciole-bold text-body text-ink dark:text-ink-night">
                    {tag.garment?.name}
                  </Text>
                  <Text numberOfLines={1} className="font-luciole text-legend text-muted dark:text-muted-night">
                    {[tag.garment?.brand, tag.garment?.category].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View className="flex-row justify-center gap-2" accessibilityLabel={`Image ${page + 1} sur 2`}>
          {[0, 1].map((i) => (
            <View key={i} className={`h-2 w-2 rounded-full ${i === page ? 'bg-ink dark:bg-ink-night' : 'bg-ink/20 dark:bg-ink-night/30'}`} />
          ))}
        </View>
      </View>

      <View className="px-5">
        <TextField
          label="Légende"
          value={caption}
          onChangeText={setCaption}
          placeholder="Ma tenue du jour…"
          multiline
          maxLength={2200}
          editable={!posted}
          hint={posted ? undefined : 'Elle accompagne le post ; 2 200 caractères au plus.'}
        />
      </View>

      <ActionBar>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        {/* Le fil de Penderie, en plus d'Instagram : les points y deviennent des mentions. */}
        {look.post ? (
          <Button label="Voir la publication dans le fil" variant="secondary" onPress={() => router.push({ pathname: '/fil/[id]', params: { id: look.post!.id } })} />
        ) : (
          <Button label="Publier dans Penderie" variant="secondary" onPress={() => router.push({ pathname: '/look/[id]/publier', params: { id: look.id } })} disabled={saving} />
        )}
        {!posted && (
          <>
            {/* La légende part avec l'état : un seul envoi. */}
            <Button label="Marquer comme posté" onPress={() => save({ status: 'POSTED', ...(captionChanged ? { caption: caption.trim() || null } : {}) })} loading={saving} />
            {captionChanged && <Button label="Enregistrer la légende" variant="secondary" onPress={() => save({ caption: caption.trim() || null })} disabled={saving} />}
            {/* Un look publié dans le fil ne repasse plus en préparation (règle de l'API). */}
            {!look.post && (
              <Button
                label="Modifier les points"
                variant="ghost"
                onPress={async () => {
                  await save({ status: 'TAGGING' });
                  router.back();
                }}
                disabled={saving}
              />
            )}
          </>
        )}
        {posted && <Button label="Retour à l'accueil" variant="secondary" onPress={() => router.dismissTo('/')} />}
      </ActionBar>
    </>
  );
}
