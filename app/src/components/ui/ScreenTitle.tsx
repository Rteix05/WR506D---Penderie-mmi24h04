import { Text, View } from 'react-native';

import { Heading } from '@/components/ui/Heading';

/**
 * Titre de page de la lib Figma (titrePage() : Typolio 32 encre, légende
 * Luciole 12 en dessous). Un seul par écran (DS §4). La maquette l'affiche
 * en capitales. Avec un testID : le titre, et « <testID>-legend » pour la légende.
 */
export function ScreenTitle({ title, legend, testID }: { title: string; legend?: string; testID?: string }) {
  return (
    <View className="gap-1">
      <Heading level="h3" accessibilityRole="header" testID={testID} className="uppercase text-ink dark:text-ink-night">
        {title}
      </Heading>
      {legend && <Text testID={testID && `${testID}-legend`} className="font-luciole text-legend text-muted dark:text-muted-night">{legend}</Text>}
    </View>
  );
}
