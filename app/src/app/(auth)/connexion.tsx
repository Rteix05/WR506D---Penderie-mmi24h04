import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { login } from '@/lib/api';

/**
 * L'API n'a pas encore de réinitialisation par e-mail (il faudra un envoi
 * d'e-mails, Mailpit en dev). Le lien de la maquette est là, il explique.
 */
function forgotPassword() {
  Alert.alert('Mot de passe oublié', 'La réinitialisation par e-mail arrive bientôt. En attendant, demande à un administrateur de Penderie.');
}

/**
 * Connexion, d'après la maquette « Authentification — Connexion »
 * (design/figma-plugin/lots/14-final.body.js) : bandeau rose à 6 % avec le
 * logo, PENDERIE et la phrase d'accroche ; e-mail, mot de passe ;
 * SE CONNECTER ; lien vers l'inscription.
 *
 * Écran Figma de référence : node 135:1776 de la page « Maquette v2 ».
 * Absents volontairement : les « comptes de démonstration » (raccourcis du
 * prototype Figma, pas une fonction de l'app) et le chevron « v » des
 * champs (la maquette y a posé le composant liste déroulante par erreur).
 *
 * En cas de succès, la session change et la racine bascule seule vers
 * l'app : pas de navigation à faire ici.
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = useMutation({ mutationFn: () => login(email.trim().toLowerCase(), password) });
  const canSubmit = email.trim() !== '' && password !== '';

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg dark:bg-bg-night" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="gap-6" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View className="items-center gap-4 bg-primary/[0.06] px-5 pb-14" style={{ paddingTop: insets.top + 48 }}>
          <Image source={require('@/assets/images/logo.png')} style={{ width: 72, height: 66 }} contentFit="contain" accessibilityLabel="Logo Penderie" />
          <View className="items-center gap-2">
            <Text accessibilityRole="header" className="font-typolio text-h3 text-ink dark:text-ink-night">
              PENDERIE
            </Text>
            <Text className="text-center font-luciole text-body text-muted dark:text-muted-night">Range, retrouve, prête. Entre amis, et sans rien publier.</Text>
          </View>
        </View>

        <View className="gap-5 px-5">
          <TextField
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="mathis@example.com"
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
        </View>

        <View className="items-end px-5">
          <Pressable accessibilityRole="link" onPress={forgotPassword} hitSlop={12} className="py-1">
            <Text className="font-luciole text-legend text-primary dark:text-primary-night">Mot de passe oublié ?</Text>
          </Pressable>
        </View>

        <View className="gap-3 px-5">
          {submit.isError && (
            <Text accessibilityRole="alert" className="font-luciole text-body text-error dark:text-error-night">
              {submit.error.message}
            </Text>
          )}
          <Button label="SE CONNECTER" onPress={() => submit.mutate()} disabled={!canSubmit} loading={submit.isPending} />
        </View>

        <View className="items-center px-5">
          <Link href="/inscription" className="py-3 font-luciole-bold text-legend text-primary dark:text-primary-night">
            Pas encore de compte ? Créer un compte
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
