import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { useDraft } from '@/lib/add-draft';
import { pickPhoto } from '@/lib/photo';

/**
 * « Ajouter un objet » (Figma « Objet — Scanner », node 135:1949) : le
 * viseur, ce que la photo permet, puis Prendre / Importer une photo, ou
 * Ajouter manuellement. La photo part ensuite à l'analyse par l'IA.
 */
export default function ScanScreen() {
  const { update, reset } = useDraft();

  // Nouveau parcours : brouillon vide (le retour depuis l'échec garde l'écran monté).
  useEffect(() => reset('item'), [reset]);

  const take = async (source: 'camera' | 'library') => {
    const photo = await pickPhoto(source);
    if (!photo) return;
    update({ photo });
    router.push('/ajout/analyse');
  };

  return (
    <FlowScreen>
      <StepHeader close onClose={closeFlow} title="Ajouter un objet" legend="Prends-le en photo, on remplit le reste" />

      {/* Viseur : illustration de la maquette (le cadrage se fait dans l'appareil photo). */}
      <View className="px-5">
        <View className="h-[360px] items-center justify-center gap-3 rounded-lg bg-ink/[0.06] dark:bg-ink-night/10" accessible accessibilityLabel="Cadre bien l'objet.">
          <View className="h-[225px] w-[210px] items-center justify-center rounded-sm border-2 border-error">
            <View className="h-0.5 w-40 bg-error" />
          </View>
          <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">Cadre bien l&apos;objet.</Text>
        </View>
      </View>

      <View style={E1} className="mx-5 gap-1 rounded-md bg-surface p-4 dark:bg-surface-night">
        <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">Ce que la photo permet</Text>
        <Text className="font-luciole text-body text-ink dark:text-ink-night">
          Le nom, la marque et la catégorie sont reconnus automatiquement. Tu pourras tout corriger à l&apos;étape suivante.
        </Text>
      </View>

      <ActionBar>
        <Button label="Prendre une photo" onPress={() => take('camera')} />
        <Button label="Importer une photo" variant="secondary" onPress={() => take('library')} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            reset('item');
            router.push('/ajout/objet/infos');
          }}
          className="min-h-11 items-center justify-center">
          <Text className="font-luciole-bold text-body text-primary dark:text-primary-night">Ajouter manuellement</Text>
        </Pressable>
      </ActionBar>
    </FlowScreen>
  );
}
