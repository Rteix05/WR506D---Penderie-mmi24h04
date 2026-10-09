import { Text, TextInput, View, type TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label: string;
  /** Message d'erreur sous le champ (Field / Text, état Erreur). */
  error?: string;
  /** Aide sous le champ, remplacée par l'erreur s'il y en a une. */
  hint?: string;
};

/**
 * Champ texte du DS v2 : libellé visible au-dessus (jamais un simple
 * placeholder, RAAM), bordure ink 8 % (seuls les champs en ont une), rouge
 * en cas d'erreur. L'erreur est rattachée au champ pour le lecteur d'écran.
 */
export function TextField({ label, error, hint, ...input }: Props) {
  const help = error ?? hint;

  return (
    <View className="gap-1">
      <Text className="text-legend font-bold text-ink/70 dark:text-ink-night/70">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={help}
        autoCapitalize="none"
        placeholderTextColor="#94A3B8"
        className={`min-h-11 rounded-sm border bg-surface px-3 text-body text-ink dark:bg-surface-night dark:text-ink-night ${error ? 'border-error dark:border-error-night' : 'border-ink/10 dark:border-ink-night/15'}`}
        {...input}
      />
      {help && <Text className={`text-legend ${error ? 'text-error dark:text-error-night' : 'text-muted dark:text-muted-night'}`}>{help}</Text>}
    </View>
  );
}
