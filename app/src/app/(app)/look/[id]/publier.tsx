import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { TextField } from '@/components/ui/TextField';
import { mediaSource } from '@/lib/api';
import { AUDIENCE, publishLook, type Audience } from '@/lib/feed';
import { useLook, type Look } from '@/lib/look';

/**
 * Publier le look du jour dans le fil (Figma « Fil — Publier », réduit au
 * look) : un message facultatif, et à qui le montrer. Les vêtements
 * pointés deviennent visibles, en lecture, par ces personnes.
 */
export default function PublishLookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const look = useLook(id);

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton close />
      </View>
      <View className="px-5">
        <ScreenTitle title="Publier" legend="Choisis à qui montrer ton look" />
      </View>
      {look.isPending && <ActivityIndicator className="py-10" />}
      {look.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{look.error.message}</Text>}
      {look.data && <PublishBody look={look.data} />}
    </FlowScreen>
  );
}

function PublishBody({ look }: { look: Look }) {
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<Audience>('FRIENDS');
  const [body, setBody] = useState(look.caption ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = new Date(`${look.wornOn}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const post = await publishLook(queryClient, look.id, audience, body);
      // On referme la modale, puis on ouvre la publication par-dessus le post.
      router.back();
      router.push({ pathname: '/fil/[id]', params: { id: post.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le look n'a pas pu être publié.");
      setBusy(false);
    }
  };

  return (
    <>
      <View className="gap-6 px-5">
        <View style={E1} className="flex-row items-center gap-3 rounded-lg bg-surface p-3 dark:bg-surface-night">
          <Image source={mediaSource(look.photo.url)} style={{ width: 56, height: 56, borderRadius: 8 }} contentFit="cover" accessible={false} />
          <View className="flex-1">
            <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">Look du {day}</Text>
            <Text className="font-luciole text-legend text-muted dark:text-muted-night">
              {look.tags.length > 1 ? `${look.tags.length} vêtements mentionnés` : '1 vêtement mentionné'}
            </Text>
          </View>
        </View>

        <TextField label="Ton message (facultatif)" value={body} onChangeText={setBody} placeholder="Ma tenue du jour…" multiline maxLength={2000} />

        <View accessibilityRole="radiogroup" className="gap-3">
          <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
            Qui peut voir
          </Text>
          {(Object.keys(AUDIENCE) as Audience[]).map((key) => {
            const on = audience === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setAudience(key)}
                style={E1}
                className={`flex-row items-center gap-3 rounded-md bg-surface p-4 active:opacity-80 dark:bg-surface-night ${on ? 'border-2 border-primary' : ''}`}>
                <View className="flex-1 gap-0.5">
                  <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{AUDIENCE[key].title}</Text>
                  <Text className="font-luciole text-legend text-muted dark:text-muted-night">{AUDIENCE[key].detail}</Text>
                </View>
                {on && (
                  <View className="rounded-full bg-primary/[0.12] px-2 py-1">
                    <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">Choisi</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <ActionBar note="Rien n'est public. Les vêtements pointés deviennent visibles par ces personnes ; supprimer la publication les rend de nouveau privés.">
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label="Publier" onPress={publish} loading={busy} />
      </ActionBar>
    </>
  );
}
