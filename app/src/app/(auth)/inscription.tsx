import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { TextField } from '@/components/ui/TextField';
import { ApiError, register, type RegisterPayload } from '@/lib/api';

type Form = Omit<RegisterPayload, 'dateOfBirth'> & { birthDate: string };
type Errors = Partial<Record<keyof Form, string>>;

const EMPTY: Form = { firstName: '', lastName: '', username: '', birthDate: '', email: '', password: '' };

/** « 05/11/2001 » → « 2001-11-05 », ou null si la date n'existe pas. */
function toIsoDate(input: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() !== Number(month) - 1) return null;

  return `${year}-${month}-${day}`;
}

/** Vérifications faites sur le téléphone avant l'envoi ; l'API refait tout. */
function check(form: Form): Errors {
  const errors: Errors = {};
  if (form.firstName.trim() === '') errors.firstName = 'Indique ton prénom.';
  if (form.lastName.trim() === '') errors.lastName = 'Indique ton nom.';
  if (!/^[a-z0-9.-]{3,30}$/.test(form.username.trim())) errors.username = '3 à 30 caractères : minuscules, chiffres, tirets et points.';
  if (toIsoDate(form.birthDate) === null) errors.birthDate = 'Au format JJ/MM/AAAA, par exemple 05/11/2001.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Cette adresse e-mail ne semble pas valide.';
  if (form.password.length < 10) errors.password = 'Au moins 10 caractères.';

  return errors;
}

/** Champs de l'API (propertyPath des violations) → champs du formulaire. */
const API_FIELDS: Record<string, keyof Form> = {
  firstName: 'firstName',
  lastName: 'lastName',
  username: 'username',
  dateOfBirth: 'birthDate',
  email: 'email',
  password: 'password',
};

/**
 * Inscription (POST /api/auth/register) : crée le compte et son premier
 * profil, adulte et par défaut, puis connecte. Les profils de la famille
 * (enfants, proches) s'ajouteront ensuite depuis « Mon profil ».
 */
export default function RegisterScreen() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const set = (field: keyof Form) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = useMutation({
    mutationFn: () =>
      register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        dateOfBirth: toIsoDate(form.birthDate) ?? '',
        email: form.email.trim().toLowerCase(),
        password: form.password,
      }),
    onError: (error) => {
      if (error instanceof ApiError) {
        const fromApi: Errors = {};
        for (const [path, message] of Object.entries(error.violations)) {
          const field = API_FIELDS[path];
          if (field) fromApi[field] = message;
        }
        setErrors(fromApi);
      }
    },
  });

  const onSubmit = () => {
    const found = check(form);
    setErrors(found);
    if (Object.keys(found).length === 0) submit.mutate();
  };

  // Une erreur que l'on n'a pas pu rattacher à un champ s'affiche en bas.
  const generalError = submit.isError && !(submit.error instanceof ApiError && Object.keys(submit.error.violations).some((p) => p in API_FIELDS)) ? submit.error.message : null;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-5" keyboardShouldPersistTaps="handled">
          <View className="items-start gap-6">
            <BackButton />
            <ScreenTitle title="Créer un compte" legend="Ta penderie est privée : rien n'est visible tant que tu n'as rien partagé." />
          </View>

          <View className="gap-5">
            <TextField label="Prénom" value={form.firstName} onChangeText={set('firstName')} error={errors.firstName} autoCapitalize="words" autoComplete="given-name" textContentType="givenName" />
            <TextField label="Nom" value={form.lastName} onChangeText={set('lastName')} error={errors.lastName} autoCapitalize="words" autoComplete="family-name" textContentType="familyName" />
            <TextField
              label="Identifiant"
              value={form.username}
              onChangeText={(value) => set('username')(value.toLowerCase())}
              error={errors.username}
              hint="Ce que tes amis tapent pour te trouver. Minuscules, chiffres, tirets et points."
              autoComplete="username-new"
              textContentType="username"
            />
            <TextField
              label="Date de naissance"
              value={form.birthDate}
              onChangeText={set('birthDate')}
              error={errors.birthDate}
              hint="JJ/MM/AAAA"
              placeholder="05/11/2001"
              keyboardType="numbers-and-punctuation"
              autoComplete="birthdate-full"
            />
            <TextField label="Adresse e-mail" value={form.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
            <TextField
              label="Mot de passe"
              value={form.password}
              onChangeText={set('password')}
              error={errors.password}
              hint="Au moins 10 caractères."
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            {generalError && (
              <Text accessibilityRole="alert" className="font-luciole text-body text-error dark:text-error-night">
                {generalError}
              </Text>
            )}
            <Button label="CRÉER MON COMPTE" onPress={onSubmit} loading={submit.isPending} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
