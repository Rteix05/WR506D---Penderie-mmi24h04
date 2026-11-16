import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { SelectField } from '@/components/form/SelectField';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { CONDITIONS, USAGES, useDraft, type Draft } from '@/lib/add-draft';
import { pickPhoto } from '@/lib/photo';
import { createBrand, useBrands, useColors, useGarmentCategories, useSizes, useStyles } from '@/lib/reference';
import { analyzeImage } from '@/lib/scan';

/**
 * « Ton vêtement », étape 2 sur 4 (Figma « Vêtement — Ajout · Informations »,
 * 135:2981) : photo (ou étiquette scannée), nom, description, marque,
 * taille, couleur, usage, style, état.
 *
 * Pré-remplissage : après le scan d'une photo, ou en scannant l'étiquette
 * depuis la zone photo. Tout reste modifiable ; l'étiquette ne remplit que
 * les champs encore vides. Composition, entretien et pays de fabrication
 * vont dans la description (le modèle n'a pas de champ pour eux). Une
 * taille lue qui ne correspond à aucune valeur du référentiel est gardée
 * telle quelle (sizeLabel), sauf si on en choisit une.
 *
 * Écarts avec la maquette, imposés par l'API :
 *  - « Usages (plusieurs choix) » devient « Usage », un seul : le modèle
 *    n'en garde qu'un (enum GarmentUsage : quotidien, travail, sport, soirée) ;
 *  - les styles sont ceux du référentiel de l'API (décontracté, sport…) ;
 *  - une marque absente de la liste s'ajoute depuis le sélecteur ; celle
 *    lue par le scan est ajoutée à l'enregistrement (POST /api/brands) ;
 *  - « Voir les catégories de style » n'a pas encore d'écran.
 */
export default function GarmentInfoScreen() {
  const { t } = useTranslation('add');
  const { draft, update, applyScan } = useDraft();
  const brands = useBrands();
  const queryClient = useQueryClient();
  const colors = useColors();
  const styles = useStyles();
  const sizes = useSizes();
  const categories = useGarmentCategories();
  const [reading, setReading] = useState(false);
  const hint = (field: keyof Draft) => (draft.fromScan.includes(field) ? t('garmentInfo.scanned') : undefined);

  // L'échelle de tailles vient de la catégorie (Baskets → pointures), comme
  // à la modification et comme l'API la vérifie. Le type choisi à l'étape 1
  // ne sert que si la catégorie n'en impose pas : un vêtement venu du scan
  // n'a pas de type, et des baskets proposaient alors S, M, L.
  const scale = categories.data?.find((c) => c.iri === draft.category?.iri)?.sizeSystem ?? draft.garmentType?.sizes ?? 'ALPHA';
  const sizeOptions = useMemo(() => sizes.data?.get(scale) ?? [], [sizes.data, scale]);
  // useSizes range chaque échelle sous son code ET son IRI : même tableau.
  const shoes = sizes.data !== undefined && sizeOptions === sizes.data.get('EU_SHOE');
  // Type « Autre », ou vêtement venu du scan : la catégorie se choisit ici.
  const askCategory = !draft.garmentType?.slug;

  // Taille lue par le scan (« M », « 42 ») : si elle existe dans l'échelle du type, on la coche.
  useEffect(() => {
    if (draft.size || !draft.sizeLabel) return;
    const match = sizeOptions.find((v) => v.name.toLowerCase() === draft.sizeLabel.trim().toLowerCase());
    if (match) update({ size: match, sizeLabel: '' });
  }, [draft.size, draft.sizeLabel, sizeOptions, update]);

  const readLabel = async () => {
    const photo = await pickPhoto('camera');
    if (!photo) return;
    update({ photo: draft.photo ?? photo });
    setReading(true);
    try {
      const result = await analyzeImage(photo, 'LABEL_OCR');
      if (!result.suggestion) throw new Error();
      applyScan(result, { onlyEmpty: true });
    } catch {
      Alert.alert(t('garmentInfo.labelTitle'), t('garmentInfo.labelBody'));
    } finally {
      setReading(false);
    }
  };

  const photoMenu = () =>
    Alert.alert(t('garmentInfo.photoTitle'), undefined, [
      { text: t('garmentInfo.takePhoto'), onPress: async () => update({ photo: (await pickPhoto('camera')) ?? draft.photo }) },
      { text: t('garmentInfo.scanLabel'), onPress: readLabel },
      { text: t('garmentInfo.fromLibrary'), onPress: async () => update({ photo: (await pickPhoto('library')) ?? draft.photo }) },
      { text: t('garmentInfo.cancel'), style: 'cancel' },
    ]);

  return (
    <FlowScreen>
      <StepHeader step={2} title={t('garmentInfo.title')} />
      {draft.scan && <Banner tone="info" title={t('garmentInfo.bannerTitle')} text={t('garmentInfo.bannerText')} />}
      <PhotoZone photo={draft.photo} art={draft.garmentType?.art ?? 'tshirt'} caption={t('garmentInfo.photoCaption')} onPress={photoMenu} />
      {reading && (
        <View className="flex-row items-center gap-3 px-5">
          <ActivityIndicator />
          <Text accessibilityLiveRegion="polite" className="font-luciole text-legend text-muted dark:text-muted-night">
            {t('garmentInfo.reading')}
          </Text>
        </View>
      )}

      <View className="gap-5 px-5">
        <TextField label={t('garmentInfo.name')} value={draft.name} onChangeText={(name) => update({ name })} placeholder={t('garmentInfo.namePlaceholder')} autoCapitalize="sentences" hint={hint('name')} />
        {askCategory && (
          <SelectField
            label={t('garmentInfo.category')}
            value={draft.category?.name ?? null}
            loading={categories.isPending}
            hint={hint('category')}
            options={(categories.data ?? []).map((c) => ({ key: c.iri, label: c.name }))}
            // Une autre catégorie peut changer d'échelle (pull → baskets) : la taille choisie ne vaut plus.
            onSelect={(iri) => update({ category: categories.data?.find((c) => c.iri === iri) ?? null, size: null })}
          />
        )}
        <SelectField
          label={t('garmentInfo.brand')}
          placeholder={t('garmentInfo.optional')}
          value={draft.brand?.name ?? null}
          loading={brands.isPending}
          clearable
          hint={draft.brand && !draft.brand.iri ? t('garmentInfo.brandFromScan') : hint('brand')}
          options={(brands.data ?? []).map((b) => ({ key: b.iri, label: b.name }))}
          onSelect={(iri) => update({ brand: brands.data?.find((b) => b.iri === iri) ?? null })}
          createLabel={t('garmentInfo.brandCreate')}
          onCreate={async (name) => update({ brand: await createBrand(queryClient, name) })}
        />
        {sizeOptions.length > 0 && (
          <View className="gap-1">
            <Chips
              label={shoes ? t('garmentInfo.shoeSize') : t('garmentInfo.size')}
              options={sizeOptions.map((v) => ({ value: v.iri, label: v.name }))}
              selected={draft.size ? [draft.size.iri] : []}
              onToggle={(iri) => update({ size: draft.size?.iri === iri ? null : (sizeOptions.find((v) => v.iri === iri) ?? null), sizeLabel: '' })}
            />
            {!draft.size && draft.sizeLabel !== '' && (
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">
                {t('garmentInfo.sizeFromLabel', { size: draft.sizeLabel })}
              </Text>
            )}
          </View>
        )}
        <SelectField
          label={t('garmentInfo.color')}
          placeholder={t('garmentInfo.optional')}
          value={draft.color?.name ?? null}
          loading={colors.isPending}
          clearable
          hint={hint('color')}
          options={(colors.data ?? []).map((c) => ({ key: c.iri, label: c.name, swatch: c.hex }))}
          onSelect={(iri) => update({ color: colors.data?.find((c) => c.iri === iri) ?? null })}
        />
        <Chips label={t('garmentInfo.usage')} options={USAGES} selected={[draft.usage]} onToggle={(usage) => update({ usage })} />
        {styles.data && (
          <Chips
            label={t('garmentInfo.style')}
            multiple
            options={styles.data.map((s) => ({ value: s.iri, label: s.name }))}
            selected={draft.styles.map((s) => s.iri)}
            onToggle={(iri) =>
              update({ styles: draft.styles.some((s) => s.iri === iri) ? draft.styles.filter((s) => s.iri !== iri) : [...draft.styles, styles.data.find((s) => s.iri === iri)!] })
            }
          />
        )}
        <Chips label={t('garmentInfo.condition')} options={CONDITIONS} selected={draft.condition ? [draft.condition] : []} onToggle={(condition) => update({ condition: draft.condition === condition ? null : condition })} />
        <TextField
          label={t('garmentInfo.description')}
          value={draft.description}
          onChangeText={(description) => update({ description })}
          placeholder={t('garmentInfo.descriptionPlaceholder')}
          multiline
          autoCapitalize="sentences"
          hint={hint('description')}
        />
      </View>

      <ActionBar>
        <Button label={t('garmentInfo.continue')} disabled={draft.name.trim() === '' || !draft.category} onPress={() => router.push('/ajout/vetement/emplacement')} />
      </ActionBar>
    </FlowScreen>
  );
}
