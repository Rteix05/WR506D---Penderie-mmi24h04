import { Pressable, Text, View } from 'react-native';

import { E1 } from '@/components/ui/elevation';

type Option<T> = { value: T; label: string };

type Props<T> = {
  label: string;
  options: Option<T>[];
  /** Valeurs sélectionnées (une seule pour un choix unique). */
  selected: T[];
  onToggle: (value: T) => void;
  multiple?: boolean;
};

/**
 * Groupe de puces de la lib Figma (groupeChips / chip, petite taille) :
 * libellé Luciole Bold 12 au-dessus, puces rondes de 32 sur plusieurs
 * lignes, rose plein si choisie, blanche avec ombre e-1 sinon.
 */
export function Chips<T extends string>({ label, options, selected, onToggle, multiple = false }: Props<T>) {
  return (
    <View className="gap-2">
      <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{label}</Text>
      <View accessibilityRole={multiple ? undefined : 'radiogroup'} className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option.value);

          return (
            <Pressable
              key={option.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={multiple ? { checked: on } : { selected: on }}
              onPress={() => onToggle(option.value)}
              hitSlop={{ top: 6, bottom: 6 }}
              style={on ? undefined : E1}
              className={`h-8 items-center justify-center rounded-full px-3 ${on ? 'bg-primary' : 'bg-surface dark:bg-surface-night'}`}>
              <Text className={`font-luciole-bold text-legend ${on ? 'text-white' : 'text-muted dark:text-muted-night'}`}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
