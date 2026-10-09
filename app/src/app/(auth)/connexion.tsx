import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { login } from '@/lib/api';

/**
 * Connexion par e-mail et mot de passe (POST /api/auth/login). En cas de
 * succès, la session change et la racine bascule seule vers l'app : pas de
 * navigation à faire ici.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = useMutation({ mutationFn: () => login(email.trim().toLowerCase(), password) });
  const canSubmit = email.trim() !== '' && password !== '';

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center gap-8 px-5 py-6" keyboardShouldPersistTaps="handled">
          <View className="gap-3">
            <Text accessibilityRole="header" className="text-h1 font-bold uppercase text-primary dark:text-primary-night">
              Penderie
            </Text>
            <Text className="text-body text-ink/70 dark:text-ink-night/70">Ranger, retrouver et partager tout ce que je possède.</Text>
          </View>

          <View className="gap-4">
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <TextField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => canSubmit && submit.mutate()}
            />
            {submit.isError && (
              <Text accessibilityRole="alert" className="text-body text-error dark:text-error-night">
                {submit.error.message}
              </Text>
            )}
            <Button label="Se connecter" onPress={() => submit.mutate()} disabled={!canSubmit} loading={submit.isPending} />
          </View>

          <View className="flex-row flex-wrap items-center justify-center gap-1">
            <Text className="text-body text-ink/70 dark:text-ink-night/70">Pas encore de compte ?</Text>
            <Link href="/inscription" className="min-h-11 py-3 text-body font-bold text-primary underline dark:text-primary-night">
              Créer un compte
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
