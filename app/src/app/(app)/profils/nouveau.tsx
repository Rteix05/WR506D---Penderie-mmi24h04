import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { Chips } from '@/components/form/Chips';
import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { createProfile, parseFrenchDate, type NewProfile } from '@/lib/profiles';

const TYPES: { value: NewProfile['type']; labelKey: 'new.typeChild' | 'new.typeRelative' }[] = [
  { value: 'CHILD', labelKey: 'new.typeChild' },
  { value: 'RELATIVE', labelKey: 'new.typeRelative' },
];

/**
 * « Nouveau profil enfant » (Figma « Compte — Nouveau profil enfant »,
 * 135:6004) : avatar, prénom, âge, type de profil (Enfant / Famille), puis
 * « Créer ». « Tu pourras régler les autorisations juste après » : on
 * enchaîne sur l'écran Autorisations du profil créé.
 *
 * Écarts avec la maquette :
 *  - l'âge se saisit en date de naissance (le MDD la garde : c'est elle qui
 *    dit quand l'enfant devient majeur) ;
 *  - les trois interrupteurs (ajouter, emprunter, vendre) sont réglés à
 *    l'écran suivant, avec toutes les autorisations, plutôt qu'en double ici ;
 *  - pas de choix d'avatar : l'API n'en expose pas encore.
 */
export default function NewProfileScreen() {
  const { t } = useTranslation('profiles');
  const queryClient = useQueryClient();
  const [type, setType] = useState<NewProfile['type']>('CHILD');
  const [firstName, setFirstName] = useState('');
  const [birth, setBirth] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const date = parseFrenchDate(birth);

  const save = async () => {
    if (!date) {
      setErrors({ dateOfBirth: t('new.dateError') });

      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const profile = await createProfile(queryClient, { type, firstName: firstName.trim(), dateOfBirth: date });
      router.replace({ pathname: '/profils/[id]/autorisations', params: { id: profile.id, created: '1' } });
    } catch (e) {
      setSaving(false);
      setErrors(e instanceof ApiError && Object.keys(e.violations).length > 0 ? e.violations : { form: e instanceof Error ? e.message : t('new.createError') });
    }
  };

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title={type === 'CHILD' ? t('new.titleChild') : t('new.titleRelative')} legend={type === 'CHILD' ? t('new.legendChild') : t('new.legendRelative')} />
      </View>

      <View style={E1} className="mx-5 items-center gap-2 rounded-lg bg-surface py-5 dark:bg-surface-night">
        <ProfileAvatar name={firstName || '?'} size={88} />
      </View>

      <View className="gap-5 px-5">
        <TextField label={t('new.firstName')} value={firstName} onChangeText={setFirstName} placeholder={t('new.firstNamePlaceholder')} autoCapitalize="words" error={errors.firstName} />
        <TextField
          label={t('new.birthDate')}
          value={birth}
          onChangeText={setBirth}
          placeholder={t('new.birthPlaceholder')}
          keyboardType="numbers-and-punctuation"
          error={errors.dateOfBirth}
          hint={type === 'CHILD' ? t('new.childHint') : t('new.relativeHint')}
        />
        <Chips label={t('new.type')} options={TYPES.map((item) => ({ value: item.value, label: t(item.labelKey) }))} selected={[type]} onToggle={setType} />
        {errors.username && <Text className="font-luciole text-legend text-error dark:text-error-night">{errors.username}</Text>}
      </View>

      <ActionBar note={t('new.note')}>
        {errors.form && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {errors.form}
          </Text>
        )}
        <Button label={t('new.create')} onPress={save} loading={saving} disabled={firstName.trim() === '' || birth.trim() === ''} />
      </ActionBar>
    </FlowScreen>
  );
}
