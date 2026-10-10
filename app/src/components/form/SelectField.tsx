import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { E1 } from '@/components/ui/elevation';

export type SelectOption = { key: string; label: string; hint?: string; swatch?: string | null };

type Props = {
  label: string;
  value: string | null;
  placeholder?: string;
  options: SelectOption[];
  onSelect: (key: string | null) => void;
  /** Permet de vider le choix (champ facultatif). */
  clearable?: boolean;
  /** Création à la volée (« + Nouvelle pièce ») : reçoit le nom tapé. */
  onCreate?: (name: string) => Promise<void>;
  createLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Aide sous le champ (ex. « Rempli par le scan »). */
  hint?: string;
};

/**
 * Liste déroulante de la lib Figma (champSelect : libellé Luciole Bold 12,
 * champ blanc de 48, rayon 12, ombre e-1, chevron « v »). Le choix se fait
 * dans une feuille qui monte du bas, avec une recherche dès 8 options et,
 * si prévu, la création d'une nouvelle valeur.
 */
export function SelectField({ label, value, placeholder = 'Choisir', options, onSelect, clearable = false, onCreate, createLabel, disabled = false, loading = false, hint }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-1">
      <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${value ?? placeholder}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={E1}
        className={`h-12 flex-row items-center justify-between rounded-sm bg-surface px-4 dark:bg-surface-night ${disabled ? 'opacity-50' : 'active:opacity-80'}`}>
        <Text numberOfLines={1} className={`flex-1 font-luciole text-body ${value ? 'text-ink dark:text-ink-night' : 'text-muted dark:text-muted-night'}`}>
          {loading ? 'Chargement…' : (value ?? placeholder)}
        </Text>
        <Text className="font-luciole-bold text-legend text-muted/[0.85] dark:text-muted-night">v</Text>
      </Pressable>
      {hint && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{hint}</Text>}
      {open && (
        <PickerSheet
          title={label}
          options={options}
          clearable={clearable}
          onCreate={onCreate}
          createLabel={createLabel}
          onClose={() => setOpen(false)}
          onSelect={(key) => {
            onSelect(key);
            setOpen(false);
          }}
        />
      )}
    </View>
  );
}

function PickerSheet({
  title,
  options,
  clearable,
  onCreate,
  createLabel,
  onClose,
  onSelect,
}: {
  title: string;
  options: SelectOption[];
  clearable: boolean;
  onCreate?: (name: string) => Promise<void>;
  createLabel?: string;
  onClose: () => void;
  onSelect: (key: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shown = useMemo(() => (query ? options.filter((o) => normalize(o.label).includes(normalize(query))) : options), [options, query]);

  const create = async () => {
    if (!onCreate || !newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate(newName.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} className="absolute inset-0 bg-ink/[0.55]" />
        <View style={{ paddingBottom: insets.bottom + 16, maxHeight: '80%' }} className="gap-3 rounded-t-lg bg-bg px-5 pt-5 dark:bg-bg-night">
          <View className="flex-row items-center justify-between">
            <Heading level="h4" accessibilityRole="header" className="uppercase text-ink dark:text-ink-night">
              {title}
            </Heading>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
              <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">Fermer</Text>
            </Pressable>
          </View>
          {options.length >= 8 && (
            <TextInput
              accessibilityLabel={`Rechercher dans ${title}`}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher"
              placeholderTextColor="#94A3B8"
              autoCorrect={false}
              style={E1}
              className="h-12 rounded-sm bg-surface px-4 font-luciole text-body text-ink dark:bg-surface-night dark:text-ink-night"
            />
          )}
          <FlatList
            data={shown}
            keyExtractor={(o) => o.key}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-2 pb-2"
            ListEmptyComponent={<Text className="py-3 font-luciole text-body text-muted dark:text-muted-night">{options.length === 0 ? 'Rien pour l’instant.' : 'Aucun résultat.'}</Text>}
            ListHeaderComponent={
              clearable ? (
                <Pressable accessibilityRole="button" onPress={() => onSelect(null)} className="rounded-md bg-ink/[0.03] px-4 py-3 dark:bg-ink-night/[0.06]">
                  <Text className="font-luciole text-body text-muted dark:text-muted-night">Aucun</Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => onSelect(item.key)} className="flex-row items-center gap-3 rounded-md bg-ink/[0.03] px-4 py-3 active:bg-ink/[0.07] dark:bg-ink-night/[0.06]">
                {item.swatch !== undefined && <View style={{ backgroundColor: item.swatch ?? '#E2E8F0' }} className="h-5 w-5 rounded-full border border-ink/10" />}
                <View className="flex-1">
                  <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{item.label}</Text>
                  {item.hint && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{item.hint}</Text>}
                </View>
              </Pressable>
            )}
          />
          {onCreate && (
            <View className="gap-2">
              <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{createLabel ?? 'Créer'}</Text>
              <View className="flex-row gap-2">
                <TextInput
                  accessibilityLabel={createLabel ?? 'Nom'}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Nom"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="done"
                  onSubmitEditing={create}
                  style={E1}
                  className="h-12 flex-1 rounded-sm bg-surface px-4 font-luciole text-body text-ink dark:bg-surface-night dark:text-ink-night"
                />
                <View className="w-28">
                  <Button label="Créer" variant="secondary" onPress={create} disabled={!newName.trim()} loading={creating} />
                </View>
              </View>
              {error && <Text className="font-luciole text-legend text-error dark:text-error-night">{error}</Text>}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
