import { ActivityIndicator, Pressable, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  /** primary : aplat rose, un seul par écran (DS §1). secondary : contour. ghost : texte seul. */
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
};

const CONTAINER = {
  primary: 'bg-primary',
  secondary: 'border border-primary',
  ghost: '',
} as const;

const LABEL = {
  primary: 'text-white',
  secondary: 'text-primary dark:text-primary-night',
  ghost: 'text-ink dark:text-ink-night',
} as const;

/**
 * Bouton du DS v2 (Button / Primary | Secondary | Ghost). Hauteur minimale
 * 44 px (cible tactile RAAM) ; pendant le chargement il est désactivé et
 * l'annonce au lecteur d'écran (accessibilityState.busy).
 */
export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-md px-4 ${CONTAINER[variant]} ${inactive ? 'opacity-50' : 'active:opacity-80'}`}>
      {loading && <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#D31D66'} />}
      <Text className={`text-body font-bold ${LABEL[variant]}`}>{label}</Text>
    </Pressable>
  );
}
