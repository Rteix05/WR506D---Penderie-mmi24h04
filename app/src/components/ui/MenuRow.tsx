import { Pressable, Text, View } from 'react-native';
import { E1 } from '@/components/ui/elevation';

type Props = {
  title: string;
  subtitle: string;
  onPress?: () => void;
};

/**
 * Ligne de menu de la maquette (menus Inventaire et Profil) : titre,
 * sous-titre, chevron. Sans onPress, l'entrée n'est pas encore construite :
 * elle s'affiche « Bientôt », désactivée, et le dit au lecteur d'écran.
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
      style={E1}
      className="min-h-14 flex-row items-center gap-3 rounded-md bg-surface px-4 py-3 active:opacity-80 dark:bg-surface-night">
      <View className="flex-1 gap-1">
        <Text className={`text-body font-luciole-bold ${soon ? 'text-ink/45 dark:text-ink-night/45' : 'text-ink dark:text-ink-night'}`}>{title}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{soon ? 'Bientôt' : subtitle}</Text>
      </View>
      {!soon && <Text className="text-body font-luciole-bold text-muted dark:text-muted-night">›</Text>}
    </Pressable>
  );
}
