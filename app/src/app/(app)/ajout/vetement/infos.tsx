import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { SelectField } from '@/components/form/SelectField';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { CONDITIONS, USAGES, useDraft } from '@/lib/add-draft';
import { pickPhoto } from '@/lib/photo';
import { useBrands, useColors, useGarmentCategories, useSizes, useStyles } from '@/lib/reference';
import { analyzeImage } from '@/lib/scan';

/**
 * « Ton vêtement », étape 2 sur 4 (Figma « Vêtement — Ajout · Informations »,
 * 135:2981) : photo (ou étiquette scannée, qui pré-remplit marque, taille et
 * couleur), nom, marque, taille, couleur, usage, style, état.
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
  const { draft, update } = useDraft();
  const brands = useBrands();
  const colors = useColors();
  const styles = useStyles();
  const sizes = useSizes();
  const categories = useGarmentCategories();
  const [reading, setReading] = useState(false);

  const system = draft.garmentType?.sizes ?? 'ALPHA';
  const sizeOptions = sizes.data?.get(system) ?? [];
  // Type « Autre », ou vêtement venu du scan : la catégorie se choisit ici.
  const askCategory = !draft.garmentType?.slug;

  /** Étiquette scannée : on reprend marque, taille et couleur, sans écraser ce qui est déjà saisi. */
  const readLabel = async () => {
    const photo = await pickPhoto('camera');
    if (!photo) return;
    update({ photo });
    setReading(true);
    try {
      const s = (await analyzeImage(photo, 'LABEL_OCR')).suggestion;
      if (!s) throw new Error();
      const size = s.size ? sizeOptions.find((v) => v.name.toLowerCase() === s.size?.toLowerCase()) : undefined;
      update({
        photo,
        name: draft.name || (s.name ?? ''),
        brand: draft.brand ?? (s.brand?.iri ? { iri: s.brand.iri, name: s.brand.name } : null),
        size: draft.size ?? size ?? null,
        color: draft.color ?? (s.colors[0] ? { iri: s.colors[0].iri, name: s.colors[0].name } : null),
      });
    } catch {
      Alert.alert('Étiquette', "On n'a pas réussi à lire l'étiquette. Ta photo est gardée, remplis le reste à la main.");
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
        <TextField label="Nom" value={draft.name} onChangeText={(name) => update({ name })} placeholder="T-shirt Nike" autoCapitalize="sentences" />
        {askCategory && (
          <SelectField
            label="Catégorie"
            value={draft.category?.name ?? null}
            loading={categories.isPending}
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
          options={(brands.data ?? []).map((b) => ({ key: b.iri, label: b.name }))}
          onSelect={(iri) => update({ brand: brands.data?.find((b) => b.iri === iri) ?? null })}
        />
        {sizeOptions.length > 0 && (
          <Chips
            label="Taille"
            options={sizeOptions.map((v) => ({ value: v.iri, label: v.name }))}
            selected={draft.size ? [draft.size.iri] : []}
            onToggle={(iri) => update({ size: draft.size?.iri === iri ? null : (sizeOptions.find((v) => v.iri === iri) ?? null) })}
          />
        )}
        <SelectField
          label="Couleur"
          placeholder="Facultatif"
          value={draft.color?.name ?? null}
          loading={colors.isPending}
          clearable
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
      </View>

      <ActionBar>
        <Button label="Continuer" disabled={draft.name.trim() === '' || !draft.category} onPress={() => router.push('/ajout/vetement/emplacement')} />
      </ActionBar>
    </FlowScreen>
  );
}
