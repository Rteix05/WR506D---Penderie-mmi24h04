import { Text, View } from 'react-native';

/**
 * Titre d'écran (title h3, un seul par écran — DS §4) et sa légende. Les
 * majuscules de la maquette viennent de la police Typolio, chargée dans une
 * feature dédiée ; d'ici là, la police système.
 */
export function ScreenTitle({ title, legend }: { title: string; legend?: string }) {
  return (
    <View className="gap-1">
      <Text accessibilityRole="header" className="text-h3 font-bold uppercase text-ink dark:text-ink-night">
        {title}
      </Text>
      {legend && <Text className="text-legend text-ink/70 dark:text-ink-night/70">{legend}</Text>}
    </View>
  );
}
