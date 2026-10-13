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
import { TextField } from '@/components/ui/TextField';
import { mediaSource } from '@/lib/api';
import { addTag, confirmTag, tagName, useLook } from '@/lib/look';
import { artOf, normalize, usePossessions, type Possession } from '@/lib/possessions';
import { useGarmentCategories } from '@/lib/reference';

/**
 * « Quel vêtement ? » pour un point du look :
 *  - un nouveau point (paramètres x, y : l'endroit touché sur la photo) ;
 *  - ou un point existant dont on change le vêtement (paramètre tag).
 *
 * On choisit dans son dressing, avec une recherche par nom. S'il n'y est
 * pas encore, un titre suffit : le vêtement est ajouté « à compléter »
 * (catégorie et pièce plus tard), et le point le désigne tout de suite.
 */
export default function ChooseGarmentScreen() {
  const { id, tag: tagId, x, y } = useLocalSearchParams<{ id: string; tag?: string; x?: string; y?: string }>();
  const look = useLook(id);
  const garments = usePossessions('garment');
  const categories = useGarmentCategories();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const tag = tagId ? look.data?.tags.find((t) => t.id === tagId) : undefined;
  const isNew = !tagId;
  // Les vêtements déjà pointés sur ce look passent après les autres.
  const used = new Set((look.data?.tags ?? []).map((t) => t.garment?.id).filter(Boolean));

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    const all = (garments.data ?? []).filter((g) => q === '' || normalize(g.name).includes(q));
    const current = tag?.garment?.id;

    return [...all.filter((g) => g.id === current), ...all.filter((g) => g.id !== current && !used.has(g.id)), ...all.filter((g) => g.id !== current && used.has(g.id))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garments.data, query, tag?.garment?.id, look.data?.tags]);

  const point = { x: Number(x), y: Number(y) };

  const choose = async (garment: Possession) => {
    setSaving(garment.id);
    try {
      if (isNew) {
        await addTag(queryClient, id, point.x, point.y, { garment: garment['@id'] });
      } else {
        await confirmTag(queryClient, id, tagId, garment['@id']);
      }
      router.back();
    } catch (e) {
      setSaving(null);
      Alert.alert('Impossible de désigner ce vêtement', e instanceof Error ? e.message : '');
    }
  };

  const addByTitle = async () => {
    const name = title.trim();
    if (!name) return;
    setSaving('title');
    try {
      await addTag(queryClient, id, point.x, point.y, { name });
      router.back();
    } catch (e) {
      setSaving(null);
      Alert.alert("Impossible d'ajouter ce vêtement", e instanceof Error ? e.message : '');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-5" keyboardShouldPersistTaps="handled">
        <View className="flex-row">
          <BackButton close />
        </View>
        <ScreenTitle title="Quel vêtement ?" legend={tag ? `Point ${tag.position + 1} · ${tagName(tag)}` : 'Celui que tu viens de toucher sur la photo'} />

        {isNew && (
          <View style={E1} className="gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
            <TextField
              label="Pas dans ton dressing ?"
              value={title}
              onChangeText={setTitle}
              placeholder="Veste kaki"
              autoCapitalize="sentences"
              maxLength={120}
              hint="Un titre suffit : il est ajouté à ton dressing « à compléter », tu le termineras plus tard."
              onSubmitEditing={addByTitle}
              returnKeyType="done"
            />
            <Button label={title.trim() ? `Ajouter « ${title.trim()} »` : 'Ajouter ce vêtement'} variant="secondary" onPress={addByTitle} disabled={!title.trim() || saving !== null} loading={saving === 'title'} />
          </View>
        )}

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
                {g.id === tag?.garment?.id ? (
                  <Text className="font-luciole text-legend text-cloth dark:text-cloth-night">Choisi</Text>
                ) : used.has(g.id) ? (
                  <Text className="font-luciole text-legend text-muted dark:text-muted-night">Déjà sur ce look</Text>
                ) : g.incomplete ? (
                  <Text className="font-luciole text-legend text-primary dark:text-primary-night">À compléter</Text>
                ) : null}
              </View>
              {saving === g.id && <ActivityIndicator />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
