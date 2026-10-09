import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClothVisual, type ClothKind } from '@/components/home/ClothVisual';
import { BackButton } from '@/components/ui/BackButton';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';

/**
 * « Tu ajoutes quoi ? » (Figma « Accueil — Ajouter · Choix du type », node
 * 135:1928), ouvert par la bulle « Vêtements et Objets » du menu d'ajout.
 *
 * Destinations du prototype : Vêtement ouvre l'ajout d'un vêtement
 * (« C'est quoi ? »), Objet et « Scanner à la place » ouvrent le scan
 * (« Ajouter un objet »), d'où l'on peut aussi saisir à la main.
 */
export default function AddChoiceScreen() {
  const toScan = () => router.replace('/ajout/scan');
  const toGarment = () => router.replace('/ajout/vetement/type');

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-10 pt-5">
        <View className="h-11 flex-row items-center px-5">
          <BackButton close />
        </View>
        <View className="px-5">
          <ScreenTitle title="Tu ajoutes quoi ?" legend="Les deux se rangent au même endroit" />
        </View>

        <View className="gap-3 px-5">
          <TypeCard kind="tshirt" title="Vêtement" description="Il rejoint ton dressing : taille, marque, couleur, historique de port." onPress={toGarment} />
          <TypeCard kind="pantalon" title="Objet" description="Il rejoint ton inventaire : catégorie, état, rangement précis." onPress={toScan} />
        </View>

        <View className="px-5">
          <View style={E1} className="rounded-md bg-surface p-4 dark:bg-surface-night">
            <Text className="font-luciole text-body text-muted dark:text-muted-night">
              Un vêtement peut être prêté et vendu comme un objet. La différence est ce qu&apos;on te demande à l&apos;ajout, et l&apos;endroit où tu le retrouves.
            </Text>
          </View>
        </View>

        <View className="px-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scanner à la place, photographie, on remplit pour toi"
            onPress={toScan}
            style={E1}
            className="flex-row items-center justify-between rounded-md bg-surface px-4 py-3 active:opacity-80 dark:bg-surface-night">
            <View className="flex-1 gap-0.5">
              <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">Scanner à la place</Text>
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">Photographie, on remplit pour toi</Text>
            </View>
            <Text className="font-luciole-bold text-body text-muted/[0.85] dark:text-muted-night">›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Carte de type (Figma « Carte Vêtement » / « Carte Objet ») : vignette 72 encre 4 %, titre Typolio 24. */
function TypeCard({ kind, title, description, onPress }: { kind: ClothKind; title: string; description: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${description}`}
      onPress={onPress}
      style={E1}
      className="flex-row items-center gap-3 rounded-md bg-surface p-3 active:opacity-80 dark:bg-surface-night">
      <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-sm bg-ink/[0.04]">
        {/* Vignette de 50,4 dans Figma, soit × 1,143 de la taille mosaïque. */}
        <ClothVisual kind={kind} scale={1.143} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-typolio text-h4 uppercase text-ink dark:text-ink-night">{title}</Text>
        <Text className="max-w-[190px] font-luciole text-legend leading-4 text-muted dark:text-muted-night">{description}</Text>
      </View>
    </Pressable>
  );
}
