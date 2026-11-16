import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('add');
  const { draft, update } = useDraft();
  const categories = useItemCategories();
  const hint = (field: keyof Draft) => (draft.fromScan.includes(field) ? t('itemInfo.scanned') : undefined);

  const changePhoto = () =>
    Alert.alert(t('itemInfo.photoTitle'), undefined, [
      { text: t('itemInfo.takePhoto'), onPress: async () => update({ photo: (await pickPhoto('camera')) ?? draft.photo }) },
      { text: t('itemInfo.fromLibrary'), onPress: async () => update({ photo: (await pickPhoto('library')) ?? draft.photo }) },
      { text: t('itemInfo.cancel'), style: 'cancel' },
    ]);

  return (
    <FlowScreen>
      <StepHeader step={1} title={t('itemInfo.title')} />
      {draft.scan && <Banner tone="info" title={t('itemInfo.bannerTitle')} text={t('itemInfo.bannerText')} />}
      <PhotoZone photo={draft.photo} art="pantalon" height={160} caption={draft.photo ? undefined : t('itemInfo.addPhoto')} onPress={changePhoto} />

      <View className="gap-5 px-5">
        <TextField label={t('itemInfo.name')} value={draft.name} onChangeText={(name) => update({ name })} placeholder={t('itemInfo.namePlaceholder')} autoCapitalize="sentences" hint={hint('name')} />
        <TextField
          label={t('itemInfo.description')}
          value={draft.description}
          onChangeText={(description) => update({ description })}
          placeholder={t('itemInfo.descriptionPlaceholder')}
          multiline
          autoCapitalize="sentences"
          hint={hint('description')}
        />
        <SelectField
          label={t('itemInfo.category')}
          placeholder={t('itemInfo.optional')}
          value={draft.category?.name ?? null}
          loading={categories.isPending}
          clearable
          hint={hint('category')}
          options={(categories.data ?? []).map((c) => ({ key: c.iri, label: c.name }))}
          onSelect={(iri) => update({ category: categories.data?.find((c) => c.iri === iri) ?? null })}
        />
        <Chips label={t('itemInfo.condition')} options={CONDITIONS} selected={draft.condition ? [draft.condition] : []} onToggle={(condition) => update({ condition: draft.condition === condition ? null : condition })} />
        <TextField
          label={t('itemInfo.notes')}
          value={draft.notes}
          onChangeText={(notes) => update({ notes })}
          placeholder={t('itemInfo.notesPlaceholder')}
          multiline
          autoCapitalize="sentences"
          hint={t('itemInfo.notesHint')}
        />
      </View>

      <ActionBar>
        <Button label={t('itemInfo.continue')} disabled={draft.name.trim() === ''} onPress={() => router.push('/ajout/objet/emplacement')} />
      </ActionBar>
    </FlowScreen>
  );
}
