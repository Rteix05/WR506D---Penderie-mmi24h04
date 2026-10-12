import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { frenchDate, parseFrenchDate, profileKind, updateProfile, useAccountProfile, type AccountProfile } from '@/lib/profiles';

/**
 * « Modifier le profil » (Figma « Compte — Modifier un profil »,
 * 227:37243) : avatar, prénom, puis ce qui définit le profil.
 *
 * Le tuteur change tout (prénom, nom, nom affiché, naissance, bio) ; un
 * profil qui se modifie lui-même ne change que son nom affiché et sa bio
 * (son identité et sa tutelle appartiennent au tuteur, MDD). Un enfant
 * devenu majeur peut passer « profil famille ».
 *
 * Écarts avec la maquette : « Qui est-ce ? » (conjoint, enfant, proche,
 * ami) n'existe pas dans le modèle de données ; les autorisations
 * (« Ajouter des objets », « Prêter »…) se règlent sur leur propre écran.
 */
export default function EditProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAccountProfile(id);

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton close />
      </View>
      {profile.isPending && <ActivityIndicator className="py-10" />}
      {profile.data && <EditForm profile={profile.data} />}
    </FlowScreen>
  );
}

function EditForm({ profile }: { profile: AccountProfile }) {
  const queryClient = useQueryClient();
  const full = profile.canManage;
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [birth, setBirth] = useState(frenchDate(profile.dateOfBirth));
  const [bio, setBio] = useState(profile.bio ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async (extra: { type?: 'RELATIVE' } = {}) => {
    const dateOfBirth = parseFrenchDate(birth);
    if (full && !dateOfBirth) {
      setErrors({ dateOfBirth: 'Date au format JJ/MM/AAAA.' });

      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await updateProfile(queryClient, profile.id, {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        ...(full ? { firstName: firstName.trim(), lastName: lastName.trim(), dateOfBirth: dateOfBirth ?? profile.dateOfBirth } : {}),
        ...extra,
      });
      router.back();
    } catch (e) {
      setSaving(false);
      setErrors(e instanceof ApiError && Object.keys(e.violations).length > 0 ? e.violations : { form: e instanceof Error ? e.message : 'Enregistrement impossible.' });
    }
  };

  return (
    <>
      <View className="px-5">
        <ScreenTitle title="Modifier le profil" legend={`${profile.displayName} · ${profileKind(profile).toLowerCase()}`} />
      </View>

      <View style={E1} className="mx-5 items-center rounded-lg bg-surface py-5 dark:bg-surface-night">
        <ProfileAvatar name={displayName || profile.displayName} size={88} />
      </View>

      {!full && <Banner tone="info" title="Ton identité est gérée par ton tuteur" text="Tu peux changer ton nom affiché et ta bio." />}

      <View className="gap-5 px-5">
        {full && <TextField label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" error={errors.firstName} />}
        {full && <TextField label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" error={errors.lastName} />}
        <TextField label="Nom affiché" value={displayName} onChangeText={setDisplayName} hint="Celui que voient les amis." error={errors.displayName} />
        {full && <TextField label="Date de naissance" value={birth} onChangeText={setBirth} placeholder="JJ/MM/AAAA" keyboardType="numbers-and-punctuation" error={errors.dateOfBirth} />}
        <TextField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={500} placeholder="Facultatif" error={errors.bio} />
      </View>

      {full && profile.type === 'CHILD' && profile.age >= 18 && (
        <View className="gap-2 px-5">
          <Banner tone="success" title={`${profile.displayName} est majeur`} text="Tu peux en faire un profil famille : ses restrictions d'enfant sont levées, tu le gères toujours." />
          <Button label="Passer en profil famille" variant="secondary" onPress={() => save({ type: 'RELATIVE' })} disabled={saving} />
        </View>
      )}

      <ActionBar note="Chaque profil garde son propre inventaire et son propre dressing.">
        {errors.form && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {errors.form}
          </Text>
        )}
        <Button label="Enregistrer" onPress={() => save()} loading={saving} disabled={displayName.trim() === ''} />
      </ActionBar>
    </>
  );
}
