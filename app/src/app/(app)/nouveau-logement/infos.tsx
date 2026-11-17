import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { SelectField } from '@/components/form/SelectField';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { TextField } from '@/components/ui/TextField';
import { usePlaceDraft } from '@/lib/place-draft';
import { placeKinds } from '@/lib/places';
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
  const { t } = useTranslation('places');
  const { draft, update, chooseKind } = usePlaceDraft();
  const locations = useLocations();
  const hasPrimary = locations.data?.places.some((p) => p.primary) ?? false;
  // Par défaut : principal s'il n'y en a pas encore.
  const primary = draft.primary ?? !hasPrimary;

  return (
    <FlowScreen>
      <StepHeader title={t('newPlace.infos.title')} step={2} />

      <View className="gap-5 px-5">
        <TextField
          label={t('newPlace.infos.name')}
          value={draft.name}
          onChangeText={(name) => update({ name })}
          autoCapitalize="sentences"
          placeholder={t('newPlace.infos.namePlaceholder')}
        />
        <SelectField
          label={t('newPlace.infos.type')}
          value={draft.kind.label}
          options={placeKinds().map((k) => ({ key: k.key, label: k.label, hint: k.description }))}
          onSelect={(key) => chooseKind(placeKinds().find((k) => k.key === key) ?? draft.kind)}
        />
        <TextField
          label={t('newPlace.infos.address')}
          value={draft.address}
          onChangeText={(address) => update({ address })}
          autoCapitalize="words"
          placeholder={t('newPlace.infos.addressPlaceholder')}
          textContentType="fullStreetAddress"
        />
        <Chips
          label={t('newPlace.infos.primary')}
          options={[
            { value: 'yes', label: t('newPlace.yes') },
            { value: 'no', label: t('newPlace.no') },
          ]}
          selected={[primary ? 'yes' : 'no']}
          onToggle={(value) => update({ primary: value === 'yes' })}
        />
        {primary && hasPrimary && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('newPlace.infos.primaryWarning')}</Text>}
      </View>

      <View style={E1} className="mx-5 rounded-md bg-surface p-4 dark:bg-surface-night">
        <Text className="font-luciole text-body text-muted dark:text-muted-night">{t('newPlace.infos.addressNote')}</Text>
      </View>

      <ActionBar>
        <Button
          label={t('actions.continue')}
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
