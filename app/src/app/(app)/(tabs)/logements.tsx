import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';

/** Logements › pièces › rangements › cartons : arrive dans la feature suivante. */
export default function PlacesScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6">
        <ScreenTitle title="Logements" legend="Où sont rangées tes affaires" />
        <View style={E1} className="gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
          <Text className="text-body font-luciole-bold text-ink dark:text-ink-night">Bientôt</Text>
          <Text className="font-luciole text-body text-ink/70 dark:text-ink-night/70">
            Tu pourras décrire ton logement pièce par pièce, jusqu&apos;à l&apos;étagère et au carton, et le partager avec tes colocataires.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
