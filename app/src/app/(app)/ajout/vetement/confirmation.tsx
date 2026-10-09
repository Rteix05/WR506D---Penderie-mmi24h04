import { router } from 'expo-router';
import { View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { InfoCard, PathCard } from '@/components/ui/InfoCard';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { locationPath, useDraft } from '@/lib/add-draft';

/**
 * « Vêtement ajouté ! » (Figma « Vêtement — Ajout · Confirmation »,
 * 135:3164). Écart : « Voir le vêtement » attend la fiche vêtement, pas
 * encore construite ; on revient à l'accueil, où il apparaît.
 */
export default function GarmentDoneScreen() {
  const { draft, created, reset } = useDraft();
  const total = created?.total ?? 0;

  return (
    <FlowScreen>
      <View className="pt-1">
        <Banner tone="success" title="Vêtement ajouté !" text={`${total} ${total > 1 ? 'vêtements' : 'vêtement'} dans ton dressing.`} />
      </View>
      <View className="px-5">
        <ScreenTitle title={created?.name ?? draft.name} legend={['Dans ma penderie', draft.location.room?.name].filter(Boolean).join(' · ')} />
      </View>
      <PhotoZone photo={draft.photo} art={draft.garmentType?.art ?? 'tshirt'} />
      <PathCard title="Localisation" path={locationPath(draft.location)} />
      <InfoCard
        title="Et maintenant"
        rows={[
          ['Le porter', 'Il entre dans les suggestions de tenues'],
          ['Le prêter', 'À un ami, en 3 étapes'],
          ['Le vendre', 'Visible par tes amis'],
        ]}
      />
      <ActionBar>
        <Button label="Retour à l'accueil" onPress={closeFlow} />
        <Button
          label="Ajouter un autre vêtement"
          variant="secondary"
          onPress={() => {
            reset('garment');
            router.dismissTo('/ajout/vetement/type');
          }}
        />
      </ActionBar>
    </FlowScreen>
  );
}
