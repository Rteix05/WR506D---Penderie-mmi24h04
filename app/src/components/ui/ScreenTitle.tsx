import { Text, View } from 'react-native';

import { Heading } from '@/components/ui/Heading';

/**
 * Titre de page de la lib Figma (titrePage() : Typolio 32 encre, légende
 * Luciole 12 en dessous). Un seul par écran (DS §4). La maquette l'affiche
 * en capitales.
 */
export function ScreenTitle({ title, legend }: { title: string; legend?: string }) {
  return (
    <View className="gap-1">
      <Heading level="h3" accessibilityRole="header" className="uppercase text-ink dark:text-ink-night">
        {title}
      </Heading>
      {legend && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{legend}</Text>}
    </View>
  );
}
