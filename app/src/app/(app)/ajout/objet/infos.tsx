import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { SelectField } from '@/components/form/SelectField';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { CONDITIONS, useDraft, type Draft } from '@/lib/add-draft';
import { pickPhoto } from '@/lib/photo';
import { useItemCategories } from '@/lib/reference';

const SCANNED = 'Rempli par le scan, modifiable.';

/**
 * « Ton objet », étape 1 sur 4 (Figma « Objet — Informations », 135:1998) :
 * photo, nom, description, catégorie, état, note.
 *
 * Après un scan, tout arrive pré-rempli (nom, description, catégorie) et
 * reste modifiable : un bandeau le dit, et chaque champ rempli par le scan
 * le rappelle tant qu'on n'y a pas touché.
 *
 * Écarts avec la maquette, imposés par l'API : pas de « Marque » (un objet
 * n'a pas de marque dans le modèle de données, seuls les vêtements en ont)
 * ni de « Souvenir » (l'entité Memory n'est pas encore dans la base).
 */
export default function ItemInfoScreen() {
  const { draft, update } = useDraft();
  const categories = useItemCategories();
  const hint = (field: keyof Draft) => (draft.fromScan.includes(field) ? SCANNED : undefined);

  const changePhoto = () =>
    Alert.alert('Photo', undefined, [
      { text: 'Prendre une photo', onPress: async () => update({ photo: (await pickPhoto('camera')) ?? draft.photo }) },
      { text: 'Choisir dans la galerie', onPress: async () => update({ photo: (await pickPhoto('library')) ?? draft.photo }) },
      { text: 'Annuler', style: 'cancel' },
    ]);

  return (
    <FlowScreen>
      <StepHeader step={1} title="Ton objet" />
      {draft.scan && <Banner tone="info" title="Pré-rempli par le scan" text="Vérifie et corrige si besoin : rien n'est enregistré avant la fin." />}
      <PhotoZone photo={draft.photo} art="pantalon" height={160} caption={draft.photo ? undefined : 'Ajouter une photo'} onPress={changePhoto} />

      <View className="gap-5 px-5">
        <TextField label="Nom" value={draft.name} onChangeText={(name) => update({ name })} placeholder="Perceuse Bosch" autoCapitalize="sentences" hint={hint('name')} />
        <TextField
          label="Description (facultatif)"
          value={draft.description}
          onChangeText={(description) => update({ description })}
          placeholder="Perceuse sans fil, deux batteries."
          multiline
          autoCapitalize="sentences"
          hint={hint('description')}
        />
        <SelectField
          label="Catégorie"
          placeholder="Facultatif"
          value={draft.category?.name ?? null}
          loading={categories.isPending}
          clearable
          hint={hint('category')}
          options={(categories.data ?? []).map((c) => ({ key: c.iri, label: c.name }))}
          onSelect={(iri) => update({ category: categories.data?.find((c) => c.iri === iri) ?? null })}
        />
        <Chips label="État" options={CONDITIONS} selected={draft.condition ? [draft.condition] : []} onToggle={(condition) => update({ condition: draft.condition === condition ? null : condition })} />
        <TextField
          label="Note (facultatif)"
          value={draft.notes}
          onChangeText={(notes) => update({ notes })}
          placeholder="Les mèches sont dans la boîte bleue."
          multiline
          autoCapitalize="sentences"
          hint="Visible par toi seul."
        />
      </View>

      <ActionBar>
        <Button label="Continuer" disabled={draft.name.trim() === ''} onPress={() => router.push('/ajout/objet/emplacement')} />
      </ActionBar>
    </FlowScreen>
  );
}
