import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { E1 } from '@/components/ui/elevation';

type Props = TextInputProps & {
  label: string;
  /** Message d'erreur sous le champ (Field / Text, état Erreur). */
  error?: string;
  /** Aide sous le champ, remplacée par l'erreur s'il y en a une. */
  hint?: string;
};

/**
 * Champ texte du DS v2, d'après la lib Figma (champSelect() : libellé
 * Luciole Bold 12 au-dessus, champ blanc de 48 px, rayon 12, ombre e-1).
 * Le libellé est toujours visible (jamais un simple placeholder, RAAM).
 * En erreur seulement, une bordure rouge ; l'erreur est rattachée au champ
 * pour le lecteur d'écran.
 */
export function TextField({ label, error, hint, ...input }: Props) {
  const help = error ?? hint;

  return (
    <View className="gap-1">
      <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={help}
        autoCapitalize="none"
        placeholderTextColor="#94A3B8"
        style={E1}
        className={`h-12 rounded-sm bg-surface px-4 font-luciole text-body text-ink dark:bg-surface-night dark:text-ink-night ${error ? 'border border-error dark:border-error-night' : ''}`}
        {...input}
      />
      {help && <Text className={`font-luciole text-legend ${error ? 'text-error dark:text-error-night' : 'text-muted dark:text-muted-night'}`}>{help}</Text>}
    </View>
  );
}
