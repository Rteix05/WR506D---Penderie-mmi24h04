import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { useBrands, useColors, useGarmentCategories, useSizes, useStyles } from '@/lib/reference';
import { analyzeImage } from '@/lib/scan';

const SCANNED = 'Rempli par le scan, modifiable.';

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
 *  - une marque inconnue du référentiel ne peut pas être enregistrée (pas de
 *    route de création de marque) : on choisit dans la liste ;
 *  - « Voir les catégories de style » n'a pas encore d'écran.
 */
export default function GarmentInfoScreen() {
  const { draft, update, applyScan } = useDraft();
  const brands = useBrands();
  const colors = useColors();
  const styles = useStyles();
  const sizes = useSizes();
  const categories = useGarmentCategories();
  const [reading, setReading] = useState(false);
  const hint = (field: keyof Draft) => (draft.fromScan.includes(field) ? SCANNED : undefined);

  const system = draft.garmentType?.sizes ?? 'ALPHA';
  const sizeOptions = useMemo(() => sizes.data?.get(system) ?? [], [sizes.data, system]);
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
      Alert.alert('Étiquette', "On n'a pas réussi à lire l'étiquette. Remplis le reste à la main.");
    } finally {
      setReading(false);
    }
  };

  const photoMenu = () =>
    Alert.alert('Photo', undefined, [
      { text: 'Prendre une photo', onPress: async () => update({ photo: (await pickPhoto('camera')) ?? draft.photo }) },
      { text: "Scanner l'étiquette", onPress: readLabel },
      { text: 'Choisir dans la galerie', onPress: async () => update({ photo: (await pickPhoto('library')) ?? draft.photo }) },
      { text: 'Annuler', style: 'cancel' },
    ]);

  return (
    <FlowScreen>
      <StepHeader step={2} title="Ton vêtement" />
      {draft.scan && <Banner tone="info" title="Pré-rempli par le scan" text="Vérifie et corrige si besoin : rien n'est enregistré avant la fin." />}
      <PhotoZone photo={draft.photo} art={draft.garmentType?.art ?? 'tshirt'} caption="Prendre une photo ou scanner l'étiquette" onPress={photoMenu} />
      {reading && (
        <View className="flex-row items-center gap-3 px-5">
          <ActivityIndicator />
          <Text accessibilityLiveRegion="polite" className="font-luciole text-legend text-muted dark:text-muted-night">
            Lecture de l&apos;étiquette…
          </Text>
        </View>
      )}

      <View className="gap-5 px-5">
        <TextField label="Nom" value={draft.name} onChangeText={(name) => update({ name })} placeholder="T-shirt Nike" autoCapitalize="sentences" hint={hint('name')} />
        {askCategory && (
          <SelectField
            label="Catégorie"
            value={draft.category?.name ?? null}
            loading={categories.isPending}
            hint={hint('category')}
            options={(categories.data ?? []).map((c) => ({ key: c.iri, label: c.name }))}
            onSelect={(iri) => update({ category: categories.data?.find((c) => c.iri === iri) ?? null })}
          />
        )}
        <SelectField
          label="Marque"
          placeholder="Facultatif"
          value={draft.brand?.name ?? null}
          loading={brands.isPending}
          clearable
          hint={hint('brand')}
          options={(brands.data ?? []).map((b) => ({ key: b.iri, label: b.name }))}
          onSelect={(iri) => update({ brand: brands.data?.find((b) => b.iri === iri) ?? null })}
        />
        {sizeOptions.length > 0 && (
          <View className="gap-1">
            <Chips
              label="Taille"
              options={sizeOptions.map((v) => ({ value: v.iri, label: v.name }))}
              selected={draft.size ? [draft.size.iri] : []}
              onToggle={(iri) => update({ size: draft.size?.iri === iri ? null : (sizeOptions.find((v) => v.iri === iri) ?? null), sizeLabel: '' })}
            />
            {!draft.size && draft.sizeLabel !== '' && (
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">
                Lue sur l&apos;étiquette : « {draft.sizeLabel} ». Gardée telle quelle si tu n&apos;en choisis pas une.
              </Text>
            )}
          </View>
        )}
        <SelectField
          label="Couleur"
          placeholder="Facultatif"
          value={draft.color?.name ?? null}
          loading={colors.isPending}
          clearable
          hint={hint('color')}
          options={(colors.data ?? []).map((c) => ({ key: c.iri, label: c.name, swatch: c.hex }))}
          onSelect={(iri) => update({ color: colors.data?.find((c) => c.iri === iri) ?? null })}
        />
        <Chips label="Usage" options={USAGES} selected={[draft.usage]} onToggle={(usage) => update({ usage })} />
        {styles.data && (
          <Chips
            label="Style (plusieurs choix)"
            multiple
            options={styles.data.map((s) => ({ value: s.iri, label: s.name }))}
            selected={draft.styles.map((s) => s.iri)}
            onToggle={(iri) =>
              update({ styles: draft.styles.some((s) => s.iri === iri) ? draft.styles.filter((s) => s.iri !== iri) : [...draft.styles, styles.data.find((s) => s.iri === iri)!] })
            }
          />
        )}
        <Chips label="État" options={CONDITIONS} selected={draft.condition ? [draft.condition] : []} onToggle={(condition) => update({ condition: draft.condition === condition ? null : condition })} />
        <TextField
          label="Description (facultatif)"
          value={draft.description}
          onChangeText={(description) => update({ description })}
          placeholder="Coton bio, coupe ample."
          multiline
          autoCapitalize="sentences"
          hint={hint('description')}
        />
      </View>

      <ActionBar>
        <Button label="Continuer" disabled={draft.name.trim() === '' || !draft.category} onPress={() => router.push('/ajout/vetement/emplacement')} />
      </ActionBar>
    </FlowScreen>
  );
}
