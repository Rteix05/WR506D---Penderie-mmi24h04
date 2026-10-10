import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { Chips } from '@/components/form/Chips';
import { SelectField } from '@/components/form/SelectField';
import { confirmDelete, Section, soon } from '@/components/inventory/Detail';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { TextField } from '@/components/ui/TextField';
import { USAGES, type Usage } from '@/lib/add-draft';
import { ApiError } from '@/lib/api';
import { CONDITION_LABEL, deletePossession, locationOf, updatePossession, usePossession, type ConditionValue, type Kind, type Possession } from '@/lib/possessions';
import { useBrands, useColors, useGarmentCategories, useItemCategories, useLocations, useSizes, useStyles } from '@/lib/reference';

/**
 * « Modifier » (Figma « Vêtement — Modification », 135:3534), pour un objet
 * comme pour un vêtement : nom, catégorie (objet), marque, taille, couleur,
 * usage, style, état, description, notes ; l'emplacement en lecture.
 *
 * Écarts avec la maquette :
 *  - « Enregistrer » enregistre tout de suite, sans l'écran de vérification
 *    (135:3608) : on voit déjà tout sur cette page ;
 *  - un seul usage (l'API n'en garde qu'un), comme à l'ajout ;
 *  - la catégorie d'un vêtement ne change pas : l'API la fixe à la création
 *    (elle décide de l'échelle de tailles) ;
 *  - « Changer la photo » et « Déplacer » attendent leurs routes d'API.
 */
export default function EditScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const possession = usePossession(kind, id);

  if (!possession.data) {
    return (
      <FlowScreen>
        <View className="px-5">
          <BackButton close />
        </View>
        {possession.isError ? <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{possession.error.message}</Text> : <ActivityIndicator />}
      </FlowScreen>
    );
  }

  return <EditForm kind={kind} initial={possession.data} />;
}

const CONDITIONS: { value: ConditionValue; label: string }[] = (['NEW', 'EXCELLENT', 'GOOD', 'WORN', 'DAMAGED'] as const).map((value) => ({ value, label: CONDITION_LABEL[value] }));

function EditForm({ kind, initial }: { kind: Kind; initial: Possession }) {
  const queryClient = useQueryClient();
  const itemCategories = useItemCategories();
  const garmentCategories = useGarmentCategories();
  const brands = useBrands();
  const colors = useColors();
  const styles = useStyles();
  const sizes = useSizes();
  const locations = useLocations();

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [condition, setCondition] = useState<ConditionValue | null>(initial.condition ?? null);
  const [category, setCategory] = useState<string | null>(initial.category ?? null);
  const [brand, setBrand] = useState<string | null>(initial.brand ?? null);
  const [size, setSize] = useState<string | null>(initial.size ?? null);
  const [color, setColor] = useState<string | null>(initial.colors?.[0] ?? null);
  const [usage, setUsage] = useState<Usage>(initial.usage ?? 'EVERYDAY');
  const [chosenStyles, setChosenStyles] = useState<string[]>(initial.styles ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const garmentCategory = garmentCategories.data?.find((c) => c.iri === initial.category);
  // L'échelle de tailles est celle de la catégorie : l'API refuse toute autre taille (422).
  const scale = useMemo(() => (garmentCategory?.sizeSystem ? (sizes.data?.get(garmentCategory.sizeSystem) ?? []) : []), [garmentCategory, sizes.data]);
  const nameOf = (list: { iri: string; name: string }[] | undefined, iri: string | null) => (iri ? (list?.find((r) => r.iri === iri)?.name ?? null) : null);
  const back = kind === 'item' ? '/objets' : '/dressing';

  const save = async () => {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const common = {
      name: name.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
      condition,
    };
    const patch =
      kind === 'item'
        ? { ...common, category }
        : {
            ...common,
            brand,
            // Une taille choisie remplace la taille lue en texte libre.
            ...(size ? { size, sizeLabel: null } : { size: null }),
            usage,
            // Une seule couleur se choisit ici ; les autres (scan) sont gardées.
            colors: color ? [color, ...(initial.colors ?? []).filter((c) => c !== color).slice(1)] : [],
            styles: chosenStyles,
          };
    try {
      await updatePossession(queryClient, kind, initial.id, patch);
      router.back();
    } catch (e) {
      setSaving(false);
      if (e instanceof ApiError && Object.keys(e.violations).length > 0) setFieldErrors(e.violations);
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };

  const remove = () =>
    confirmDelete(kind === 'item' ? 'cet objet' : 'ce vêtement', initial.name, async () => {
      try {
        await deletePossession(queryClient, kind, initial.id);
        router.dismissTo(back);
      } catch (e) {
        Alert.alert('Suppression impossible', e instanceof Error ? e.message : '');
      }
    });

  return (
    <FlowScreen>
      <View className="px-5">
        <BackButton close />
      </View>
      <View className="px-5">
        <ScreenTitle title="Modifier" legend={initial.name} />
      </View>

      <View className="gap-5 px-5">
        <TextField label="Nom" value={name} onChangeText={setName} autoCapitalize="sentences" error={fieldErrors.name} />

        {kind === 'item' && (
          <SelectField
            label="Catégorie"
            placeholder="Facultatif"
            value={nameOf(itemCategories.data, category)}
            loading={itemCategories.isPending}
            clearable
            options={(itemCategories.data ?? []).map((c) => ({ key: c.iri, label: c.name, hint: nameOf(itemCategories.data, c.parent) ?? undefined }))}
            onSelect={setCategory}
          />
        )}

        {kind === 'garment' && (
          <>
            <SelectField
              label="Marque"
              placeholder="Facultatif"
              value={nameOf(brands.data, brand)}
              loading={brands.isPending}
              clearable
              options={(brands.data ?? []).map((b) => ({ key: b.iri, label: b.name }))}
              onSelect={setBrand}
            />
            {scale.length > 0 && (
              <View className="gap-1">
                <Chips label="Taille" options={scale.map((v) => ({ value: v.iri, label: v.name }))} selected={size ? [size] : []} onToggle={(iri) => setSize(size === iri ? null : iri)} />
                {!size && initial.sizeLabel && (
                  <Text className="font-luciole text-legend text-muted dark:text-muted-night">Taille notée : « {initial.sizeLabel} ». Gardée si tu n&apos;en choisis pas une.</Text>
                )}
                {fieldErrors.size && <Text className="font-luciole text-legend text-error dark:text-error-night">{fieldErrors.size}</Text>}
              </View>
            )}
            <SelectField
              label="Couleur"
              placeholder="Facultatif"
              value={nameOf(colors.data, color)}
              loading={colors.isPending}
              clearable
              options={(colors.data ?? []).map((c) => ({ key: c.iri, label: c.name, swatch: c.hex }))}
              onSelect={setColor}
            />
            <Chips label="Usage" options={USAGES} selected={[usage]} onToggle={setUsage} />
            {styles.data && (
              <Chips
                label="Style (plusieurs choix)"
                multiple
                options={styles.data.map((s) => ({ value: s.iri, label: s.name }))}
                selected={chosenStyles}
                onToggle={(iri) => setChosenStyles((list) => (list.includes(iri) ? list.filter((s) => s !== iri) : [...list, iri]))}
              />
            )}
          </>
        )}

        <Chips label="État" options={CONDITIONS} selected={condition ? [condition] : []} onToggle={(value) => setCondition(condition === value ? null : value)} />
        <TextField label="Description (facultatif)" value={description} onChangeText={setDescription} multiline autoCapitalize="sentences" error={fieldErrors.description} />
        <TextField label="Notes (visibles par toi seul)" value={notes} onChangeText={setNotes} multiline autoCapitalize="sentences" error={fieldErrors.notes} />

        {initial.room && (
          <Section title="Localisation" link={{ label: kind === 'item' ? "Déplacer l'objet" : 'Déplacer le vêtement', onPress: () => soon('Déplacer') }}>
            <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{locationOf(locations.data, initial) ?? '…'}</Text>
          </Section>
        )}
      </View>

      <ActionBar>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label="Enregistrer" onPress={save} loading={saving} disabled={name.trim() === ''} />
        <Pressable accessibilityRole="button" onPress={remove} hitSlop={8} className="self-center py-1">
          <Text className="font-luciole-bold text-legend text-error dark:text-error-night">{kind === 'item' ? 'Supprimer cet objet' : 'Supprimer ce vêtement'}</Text>
        </Pressable>
      </ActionBar>
    </FlowScreen>
  );
}
