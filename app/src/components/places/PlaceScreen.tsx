import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/BackButton';
import { ScreenTitle } from '@/components/ui/ScreenTitle';

/**
 * Page de la section Logements, comme « Mes objets » : barre haute de 44
 * avec le retour, titre de page et légende, puis les blocs espacés de 24.
 * La barre de navigation reste en dessous (pages des onglets).
 */
export function PlaceScreen({ title, legend, children }: PropsWithChildren<{ title: string; legend?: string }>) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-14 pt-5" keyboardShouldPersistTaps="handled">
        <View className="h-11 flex-row items-center px-5">
          <BackButton />
        </View>
        <View className="px-5">
          <ScreenTitle title={title} legend={legend || ' '} />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
