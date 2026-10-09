import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuRow } from '@/components/ui/MenuRow';
import { ScreenTitle } from '@/components/ui/ScreenTitle';

/** Le menu Inventaire de la maquette (docs/nav-menu-inventaire.png). */
export default function InventoryScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6">
        <ScreenTitle title="Inventaire" legend="Tout ce que tu possèdes" />
        <View className="gap-3">
          <MenuRow title="Mes objets" subtitle="Objets et leurs états" />
          <MenuRow title="Mon dressing" subtitle="Vêtements" />
          <MenuRow title="Mes tenues" subtitle="Suggestions et tenues enregistrées" />
          <MenuRow title="Mes collections" subtitle="Tableaux privés par défaut" />
          <MenuRow title="Mes prêts" subtitle="Prêtés et empruntés" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
