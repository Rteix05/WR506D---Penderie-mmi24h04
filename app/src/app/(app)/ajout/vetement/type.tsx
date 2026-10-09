import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { ClothVisual } from '@/components/home/ClothVisual';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { GARMENT_TYPES, useDraft, type GarmentType } from '@/lib/add-draft';
import { useGarmentCategories } from '@/lib/reference';

/**
 * « C'est quoi ? », étape 1 sur 4 (Figma « Vêtement — Ajout · Type »,
 * 135:2935) : grille de 12 types en 3 colonnes. Le type choisit la
 * catégorie du dressing (et le système de tailles) ; « Autre » laisse
 * choisir la catégorie à l'étape suivante.
 */
export default function GarmentTypeScreen() {
  const { draft, update, reset } = useDraft();
  const categories = useGarmentCategories();
  const { width } = useWindowDimensions();
  // 3 colonnes, gouttières de 20 et 12 entre les cartes (109 de large sur un écran de 393).
  const cardWidth = Math.floor((width - 40 - 24) / 3);

  useEffect(() => reset('garment'), [reset]);

  const choose = (type: GarmentType) => {
    const category = type.slug ? categories.data?.find((c) => c.slug === type.slug) : undefined;
    update({ garmentType: type, category: category ? { iri: category.iri, name: category.name } : null, size: null });
  };

  return (
    <FlowScreen>
      <StepHeader close onClose={closeFlow} step={1} title="C'est quoi ?" />

      <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-3 px-5">
        {GARMENT_TYPES.map((type) => {
          const on = draft.garmentType?.label === type.label;

          return (
            <Pressable
              key={type.label}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={type.label}
              onPress={() => choose(type)}
              style={[{ width: cardWidth }, on ? undefined : E1]}
              className={`items-center gap-2 rounded-md px-2 py-3 ${on ? 'bg-primary/[0.12]' : 'bg-surface dark:bg-surface-night'}`}>
              <View className="h-14 w-full items-center justify-center overflow-hidden rounded-sm bg-ink/[0.04]">
                <ClothVisual kind={type.art} scale={0.889} />
              </View>
              <Text className={`text-center font-luciole-bold text-legend ${on ? 'text-primary dark:text-primary-night' : 'text-ink dark:text-ink-night'}`}>{type.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ActionBar note="Le type sert à ranger le vêtement dans la bonne catégorie du dressing.">
        <Button label="Continuer" disabled={!draft.garmentType} onPress={() => router.push('/ajout/vetement/infos')} />
      </ActionBar>
    </FlowScreen>
  );
}
