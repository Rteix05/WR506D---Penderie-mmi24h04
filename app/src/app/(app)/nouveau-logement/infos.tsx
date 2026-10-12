import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { SelectField } from '@/components/form/SelectField';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { TextField } from '@/components/ui/TextField';
import { usePlaceDraft } from '@/lib/place-draft';
import { PLACE_KINDS } from '@/lib/places';
import { useLocations } from '@/lib/reference';

/**
 * Étape 2 « Ton logement » (Figma « Logement — Ajout · Informations »,
 * 135:2445) : nom, type, adresse facultative, et la note sur l'adresse.
 *
 * Écart avec la maquette : « Qui y a accès » (moi seul, ma famille, mes
 * colocataires) est remplacé par « Logement principal ». Faire entrer
 * quelqu'un dans un logement passe par une invitation acceptée par tous
 * (décision du 30/09), que l'app ne propose pas encore. Le logement
 * principal, lui, est choisi d'office quand on range un nouvel objet.
 */
export default function PlaceInfoStep() {
  const { draft, update, chooseKind } = usePlaceDraft();
  const locations = useLocations();
  const hasPrimary = locations.data?.places.some((p) => p.primary) ?? false;
  // Par défaut : principal s'il n'y en a pas encore.
  const primary = draft.primary ?? !hasPrimary;

  return (
    <FlowScreen>
      <StepHeader title="Ton logement" step={2} />

      <View className="gap-5 px-5">
        <TextField label="Nom" value={draft.name} onChangeText={(name) => update({ name })} autoCapitalize="sentences" placeholder="Ex. Maison principale" />
        <SelectField
          label="Type"
          value={draft.kind.label}
          options={PLACE_KINDS.map((k) => ({ key: k.key, label: k.label, hint: k.description }))}
          onSelect={(key) => chooseKind(PLACE_KINDS.find((k) => k.key === key) ?? draft.kind)}
        />
        <TextField
          label="Adresse (facultatif)"
          value={draft.address}
          onChangeText={(address) => update({ address })}
          autoCapitalize="words"
          placeholder="Ex. 12 rue des Lilas, Paris"
          textContentType="fullStreetAddress"
        />
        <Chips
          label="Logement principal"
          options={[
            { value: 'yes', label: 'Oui' },
            { value: 'no', label: 'Non' },
          ]}
          selected={[primary ? 'yes' : 'no']}
          onToggle={(value) => update({ primary: value === 'yes' })}
        />
        {primary && hasPrimary && (
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">Il remplacera ton logement principal actuel.</Text>
        )}
      </View>

      <View style={E1} className="mx-5 rounded-md bg-surface p-4 dark:bg-surface-night">
        <Text className="font-luciole text-body text-muted dark:text-muted-night">
          L&apos;adresse ne sert qu&apos;à toi : elle n&apos;est jamais montrée à tes amis, même sur un objet partagé.
        </Text>
      </View>

      <ActionBar>
        <Button
          label="Continuer"
          disabled={draft.name.trim() === ''}
          onPress={() => {
            update({ primary });
            router.push('/nouveau-logement/pieces');
          }}
        />
      </ActionBar>
    </FlowScreen>
  );
}
