import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PickerSheet } from '@/components/form/SelectField';
import { E1 } from '@/components/ui/elevation';

/**
 * Champ de recherche des listes (Figma « Field/Search ») : blanc, 48 de
 * haut, rayon 12, ombre e-1, loupe « o- » Luciole Bold 14, texte 16.
 */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (text: string) => void; placeholder: string }) {
  return (
    <View style={E1} className="mx-5 h-12 flex-row items-center gap-2 rounded-sm bg-surface px-4 dark:bg-surface-night">
      <Text accessible={false} className="font-luciole-bold text-[14px] text-muted/[0.85] dark:text-muted-night">
        o-
      </Text>
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(71, 85, 105, 0.85)"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        className="h-12 flex-1 font-luciole text-body text-ink dark:text-ink-night"
      />
    </View>
  );
}

/**
 * Puces de filtre (Figma « Chip/Filter ») : 36 de haut, rondes, Luciole
 * Bold 12. Choisie : aplat rose ; sinon blanche avec ombre e-1. Une seule
 * ligne qui défile à l'horizontale, comme dans la maquette.
 */
export function FilterChips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" contentContainerClassName="gap-2 px-5 pb-1">
      {options.map((option) => {
        const on = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.value)}
            style={on ? undefined : E1}
            className={`h-9 items-center justify-center rounded-full px-4 ${on ? 'bg-primary' : 'bg-surface active:opacity-80 dark:bg-surface-night'}`}>
            <Text className={`font-luciole-bold text-legend ${on ? 'text-white' : 'text-muted dark:text-muted-night'}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Puce de tri (Figma « Chip/Sort ») : 32 de haut, fond encre 5 %, libellé
 * Luciole 12 et chevron « v ». Ouvre la feuille de choix.
 */
export function SortChip<T extends string>({
  prefix,
  title,
  options,
  value,
  onChange,
}: {
  prefix: string;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${prefix} ${current}`}
        onPress={() => setOpen(true)}
        className="h-8 flex-row items-center gap-1 rounded-full bg-ink/[0.05] px-3 active:opacity-70 dark:bg-ink-night/[0.08]">
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">
          {prefix} {current}
        </Text>
        <Text className="font-luciole-bold text-legend text-muted/[0.85] dark:text-muted-night">v</Text>
      </Pressable>
      {open && (
        <PickerSheet
          title={title}
          options={options.map((o) => ({ key: o.value, label: o.label.charAt(0).toUpperCase() + o.label.slice(1) }))}
          selected={value}
          onClose={() => setOpen(false)}
          onSelect={(key) => {
            if (key !== null) onChange(key as T);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
