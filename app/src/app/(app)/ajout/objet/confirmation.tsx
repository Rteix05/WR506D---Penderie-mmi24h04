import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { ClothVisual } from '@/components/home/ClothVisual';
import { Banner, Pill } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { InfoCard } from '@/components/ui/InfoCard';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { locationPath, useDraft } from '@/lib/add-draft';

/**
 * « Objet ajouté ! » (Figma « Objet — Confirmation », 135:2103).
 * Écart : la maquette propose « Voir l'objet », mais la fiche objet n'existe
 * pas encore dans l'app ; on revient à l'accueil, où il apparaît dans les
 * derniers ajouts.
 */
export default function ItemDoneScreen() {
  const { draft, created, reset } = useDraft();
  const total = created?.total ?? 0;

  return (
    <FlowScreen>
      <View className="pt-1">
        <Banner tone="success" title="Objet ajouté !" text={`${total} ${total > 1 ? 'objets' : 'objet'} dans ta penderie.`} />
      </View>
      <View className="px-5">
        <ScreenTitle title={created?.name ?? draft.name} legend={['Disponible', draft.location.room?.name].filter(Boolean).join(' · ')} />
      </View>

      <View style={E1} className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
        <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-sm bg-ink/[0.04]">
          <ClothVisual kind="pantalon" scale={0.89} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{created?.name ?? draft.name}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{locationPath(draft.location)}</Text>
        </View>
        <Pill label="Disponible" />
      </View>

      <InfoCard
        title="Et maintenant"
        rows={[
          ['Prêter', 'À un ami, en 3 étapes'],
          ['Vendre', 'Visible par tes amis'],
          ['Déplacer', 'Si tu le ranges ailleurs'],
        ]}
      />

      <ActionBar>
        <Button label="Retour à l'accueil" onPress={closeFlow} />
        <Button
          label="Ajouter un autre objet"
          variant="secondary"
          onPress={() => {
            reset('item');
            router.dismissTo('/ajout/scan');
          }}
        />
      </ActionBar>
    </FlowScreen>
  );
}
