import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { TextField } from '@/components/ui/TextField';
import { useBoxDraft } from '@/lib/box-draft';
import { BOX_TYPES } from '@/lib/places';

/**
 * Étape 1 « Un nouveau carton » (Figma « Rangement — Création ·
 * Informations », 172:24363) : l'étiquette (le nom écrit dessus), puis
 * l'aide « À quoi sert l'étiquette ».
 *
 * Écarts avec la maquette, faute de champ côté API :
 *  - « Ce qu'il contient » (Outils, Déco…) devient le type de conteneur
 *    (carton, bac, valise…), qui, lui, existe ;
 *  - « Couleur d'étiquette » et « Note » ne sont pas proposés ;
 *  - un champ « Code » facultatif reçoit le numéro ou le QR code collé.
 * L'étape « Contenu » (choisir les objets à mettre dedans) attend la route
 * de déplacement des objets : le parcours a trois étapes.
 */
export default function BoxInfoStep() {
  const { draft, update } = useBoxDraft();

  return (
    <FlowScreen>
      <StepHeader title="Un nouveau carton" step={1} total={3} close />

      <View className="gap-5 px-5">
        <TextField label="Étiquette" value={draft.name} onChangeText={(name) => update({ name })} autoCapitalize="sentences" placeholder="Ex. Carton Bricolage" />
        <Chips label="C'est un…" options={BOX_TYPES} selected={[draft.type]} onToggle={(type) => update({ type })} />
        <TextField
          label="Code (facultatif)"
          value={draft.reference}
          onChangeText={(reference) => update({ reference })}
          autoCapitalize="characters"
          placeholder="Ex. C-12"
          hint="Le numéro ou le QR code collé dessus."
        />
      </View>

      <View style={E1} className="mx-5 gap-1 rounded-md bg-surface p-4 dark:bg-surface-night">
        <Text className="font-luciole-bold text-legend text-ink dark:text-ink-night">À quoi sert l&apos;étiquette</Text>
        <Text className="font-luciole text-body text-muted dark:text-muted-night">
          C&apos;est le mot que tu liras sur le carton, et celui que tu chercheras dans six mois. Un nom précis vaut mieux qu&apos;un numéro.
        </Text>
      </View>

      <ActionBar>
        <Button label="Continuer" disabled={draft.name.trim() === ''} onPress={() => router.push('/nouveau-carton/emplacement')} />
      </ActionBar>
    </FlowScreen>
  );
}
