import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  onPress?: () => void;
};

/**
 * Ligne de panneau (Figma « Menu/Row », lot 28) : fond encre à 3 %, rayon
 * 16, titre Luciole Bold 16, sous-titre Luciole 12, chevron « › ».
 * Sans onPress, l'entrée n'est pas encore construite : pastille « Bientôt »
 * à la place du chevron, désactivée, et annoncée comme telle.
 */
export function MenuRow({ title, subtitle, onPress }: Props) {
  const soon = onPress === undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: soon }}
      accessibilityLabel={soon ? `${title}, bientôt disponible` : `${title}, ${subtitle}`}
      onPress={onPress}
      disabled={soon}
      className="flex-row items-center justify-between gap-3 rounded-md bg-ink/[0.03] px-4 py-3 active:bg-ink/[0.07] dark:bg-ink-night/[0.06]">
      <View className={`flex-1 gap-0.5 ${soon ? 'opacity-60' : ''}`}>
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{title}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{subtitle}</Text>
      </View>
      {soon ? (
        <View className="rounded-full bg-ink/[0.06] px-2 py-1 dark:bg-ink-night/10">
          <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">Bientôt</Text>
        </View>
      ) : (
        <Text className="font-luciole-bold text-body text-muted/[0.85] dark:text-muted-night">›</Text>
      )}
    </Pressable>
  );
}
