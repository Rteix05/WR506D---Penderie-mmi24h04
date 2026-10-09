import { ActivityIndicator, Pressable, Text } from 'react-native';

import { E1, E2 } from '@/components/ui/elevation';

type Props = {
  label: string;
  onPress: () => void;
  /**
   * primary : aplat rose, un seul par écran (DS §1).
   * secondary : carte blanche, texte encre, ombre e-1 (pas de contour).
   * ghost : texte rose seul (liens d'action).
   */
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
};

const CONTAINER = {
  primary: 'bg-primary',
  secondary: 'bg-surface dark:bg-surface-night',
  ghost: '',
} as const;

const LABEL = {
  primary: 'text-white',
  secondary: 'text-ink dark:text-ink-night',
  ghost: 'text-primary dark:text-primary-night',
} as const;

/**
 * Bouton du DS v2, d'après la lib Figma (bouton() : hauteur 52, rayon 16,
 * Luciole Bold 16). Pendant le chargement il est désactivé et l'annonce au
 * lecteur d'écran (accessibilityState.busy).
 */
export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={variant === 'primary' ? E2 : variant === 'secondary' ? E1 : undefined}
      className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-md px-4 ${CONTAINER[variant]} ${inactive ? 'opacity-50' : 'active:opacity-80'}`}>
      {loading && <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#D31D66'} />}
      <Text className={`font-luciole-bold text-body ${LABEL[variant]}`}>{label}</Text>
    </Pressable>
  );
}
