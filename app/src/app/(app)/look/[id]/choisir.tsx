import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Illustration } from '@/components/inventory/PossessionCard';
import { SearchField } from '@/components/inventory/ListControls';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { mediaSource } from '@/lib/api';
import { confirmTag, tagName, useLook } from '@/lib/look';
import { artOf, normalize, usePossessions, type Possession } from '@/lib/possessions';
import { useGarmentCategories } from '@/lib/reference';

/**
 * Désigner le vêtement d'un point, parmi ceux du dressing : celui que l'IA
 * a reconnu d'abord, puis les autres, avec une recherche par nom. Le
 * vêtement absent du dressing s'ajoute par le parcours d'ajout, pré-rempli
 * par ce que l'IA a vu.
 */
export default function ChooseGarmentScreen() {
  const { id, tag: tagId } = useLocalSearchParams<{ id: string; tag: string }>();
  const look = useLook(id);
  const garments = usePossessions('garment');
  const categories = useGarmentCategories();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const tag = look.data?.tags.find((t) => t.id === tagId);

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    const all = (garments.data ?? []).filter((g) => q === '' || normalize(g.name).includes(q));
    // Le vêtement reconnu par l'IA (ou déjà désigné) en tête.
    const first = tag?.garment?.id;

    return first ? [...all.filter((g) => g.id === first), ...all.filter((g) => g.id !== first)] : all;
  }, [garments.data, query, tag?.garment?.id]);

  const choose = async (garment: Possession) => {
    setSaving(garment.id);
    try {
      await confirmTag(queryClient, id, tagId, garment['@id']);
      router.back();
    } catch (e) {
      setSaving(null);
      Alert.alert('Impossible de désigner ce vêtement', e instanceof Error ? e.message : '');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-5" keyboardShouldPersistTaps="handled">
        <View className="flex-row">
          <BackButton close />
        </View>
        <ScreenTitle title="Quel vêtement ?" legend={tag ? `Point ${tag.position + 1} · ${tagName(tag)}` : undefined} />
        <SearchField value={query} onChange={setQuery} placeholder="Chercher dans ton dressing" />

        {garments.isPending && <ActivityIndicator className="py-6" />}
        {garments.isError && <Text className="font-luciole text-body text-error dark:text-error-night">{garments.error.message}</Text>}
        {garments.data && shown.length === 0 && (
          <Text className="font-luciole text-body text-muted dark:text-muted-night">{query ? 'Aucun vêtement de ce nom.' : 'Ton dressing est vide.'}</Text>
        )}

        <View className="gap-3">
          {shown.map((g) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={g.name}
              onPress={() => choose(g)}
              disabled={saving !== null}
              style={E1}
              className="flex-row items-center gap-3 rounded-md bg-surface p-3 active:opacity-80 dark:bg-surface-night">
              <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-xs bg-cloth/[0.08]">
                {g.photos?.[0] ? (
                  <Image source={mediaSource(g.photos[0])} style={{ width: 56, height: 56 }} contentFit="cover" accessible={false} />
                ) : (
                  <Illustration kind={artOf('garment', g, categories.data)} scale={1} />
                )}
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{g.name}</Text>
                {g.id === tag?.garment?.id && (
                  <Text className="font-luciole text-legend text-cloth dark:text-cloth-night">{tag.status === 'CONFIRMED' ? 'Choisi' : "Reconnu par l'IA"}</Text>
                )}
              </View>
              {saving === g.id && <ActivityIndicator />}
            </Pressable>
          ))}
        </View>

        <Button
          label="Ajouter un nouveau vêtement"
          variant="secondary"
          onPress={() => {
            // Le parcours d'ajout s'ouvre par-dessus le look, pas par-dessus ce choix.
            router.back();
            router.push({ pathname: '/ajout/look', params: { look: id, tag: tagId } });
          }}
          disabled={saving !== null}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
