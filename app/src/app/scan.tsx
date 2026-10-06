import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isLoggedIn, login, logout } from '@/lib/api';
import { analyzeImage, PICKER_OPTIONS, type ScanKind, type ScanResult } from '@/lib/scan';

/**
 * Écran de TEST du scan par IA : se connecter, prendre ou choisir une photo,
 * l'envoyer à POST /api/scans/analyze et voir ce que le modèle a reconnu.
 * Il sera remplacé par le vrai parcours d'ajout de la maquette (scan →
 * fiche pré-remplie) ; d'ici là, il sert à mesurer la fiabilité du scan.
 */
export default function ScanScreen() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6" keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Link href="/" className="text-body text-primary dark:text-primary-night">
            ← Accueil
          </Link>
          <Text className="text-h3 font-bold text-ink dark:text-ink-night">Tester le scan</Text>
        </View>
        {loggedIn ? (
          <Scanner
            onLogout={() => {
              logout();
              setLoggedIn(false);
            }}
          />
        ) : (
          <LoginForm onDone={() => setLoggedIn(true)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = useMutation({ mutationFn: () => login(email.trim(), password), onSuccess: onDone });

  return (
    <View className="gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
      <Text className="text-body font-bold text-ink dark:text-ink-night">Connexion</Text>
      <Text className="text-legend text-muted dark:text-muted-night">
        Un compte de l&apos;API (créé par POST /api/auth/register ou par les tests manuels).
      </Text>
      <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      {submit.isError && <Text className="text-body text-error dark:text-error-night">{submit.error.message}</Text>}
      <Button label={submit.isPending ? 'Connexion…' : 'Se connecter'} onPress={() => submit.mutate()} disabled={submit.isPending} />
    </View>
  );
}

function Scanner({ onLogout }: { onLogout: () => void }) {
  const [kind, setKind] = useState<ScanKind>('PHOTO');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scan = useMutation({
    mutationFn: (asset: ImagePicker.ImagePickerAsset) => analyzeImage(asset, kind),
    onError: (error) => {
      if (error.message.startsWith('Session expirée')) onLogout();
    },
  });

  const pick = async (source: 'camera' | 'library') => {
    setNotice(null);
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setNotice("L'accès à l'appareil photo est refusé : autorise-le dans les réglages du téléphone.");
        return;
      }
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return;
    setPhoto(result.assets[0]);
    scan.mutate(result.assets[0]);
  };

  return (
    <View className="gap-6">
      <View className="flex-row gap-3">
        <Choice label="Objet en photo" active={kind === 'PHOTO'} onPress={() => setKind('PHOTO')} />
        <Choice label="Étiquette" active={kind === 'LABEL_OCR'} onPress={() => setKind('LABEL_OCR')} />
      </View>
      <View className="gap-3">
        <Button label="Prendre une photo" onPress={() => pick('camera')} disabled={scan.isPending} />
        <Button label="Choisir dans la galerie" onPress={() => pick('library')} disabled={scan.isPending} secondary />
      </View>
      {notice && <Text className="text-body text-error dark:text-error-night">{notice}</Text>}

      {photo && <Image source={{ uri: photo.uri }} contentFit="contain" style={{ width: '100%', height: 256, borderRadius: 24 }} accessibilityLabel="Photo envoyée au scan" />}
      {scan.isPending && (
        <View className="flex-row items-center gap-3">
          <ActivityIndicator />
          <Text className="text-body text-muted dark:text-muted-night">
            Analyse en cours… (jusqu&apos;à une minute si les premiers modèles sont saturés)
          </Text>
        </View>
      )}
      {scan.isError && <Text className="text-body text-error dark:text-error-night">{scan.error.message}</Text>}
      {scan.isSuccess && <ResultCard result={scan.data} />}

      <Pressable accessibilityRole="button" onPress={onLogout} className="min-h-11 justify-center">
        <Text className="text-body text-muted dark:text-muted-night">Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const STATUS = {
  SUCCESS: { label: 'Reconnu', className: 'text-main dark:text-main-night' },
  PARTIAL: { label: 'Reconnu en partie', className: 'text-cloth dark:text-cloth-night' },
  FAILED: { label: 'Échec — saisie manuelle', className: 'text-error dark:text-error-night' },
} as const;

function ResultCard({ result }: { result: ScanResult }) {
  const s = result.suggestion;
  const rows: [string, string | null | undefined][] = s
    ? [
        ['Type', s.type === 'GARMENT' ? 'Vêtement' : 'Objet'],
        ['Nom', s.name],
        ['Catégorie', s.category?.name],
        ['Marque', s.brand ? `${s.brand.name}${s.brand.iri ? '' : ' (nouvelle)'}` : null],
        ['Couleurs', s.colors.map((c) => c.name).join(', ')],
        ['Taille', s.size],
        ['Composition', s.composition.map((p) => (p.percent === null ? p.material : `${p.percent} % ${p.material}`)).join(', ')],
        ['Entretien', s.care.join(' · ')],
        ['Fabriqué en', s.madeIn],
        ['Description', s.description],
        ['Confiance', s.confidence === null ? null : `${Math.round(s.confidence * 100)} %`],
      ]
    : [];

  return (
    <View className="gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
      <Text className={`text-body font-bold ${STATUS[result.status].className}`}>{STATUS[result.status].label}</Text>
      {result.model && <Text className="text-legend text-muted dark:text-muted-night">Modèle : {result.model}</Text>}
      {result.error && <Text className="text-body text-error dark:text-error-night">{result.error}</Text>}
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <View key={label} className="gap-1">
            <Text className="text-legend text-muted dark:text-muted-night">{label}</Text>
            <Text className="text-body text-ink dark:text-ink-night">{value}</Text>
          </View>
        ))}
    </View>
  );
}

function Field(props: { label: string } & React.ComponentProps<typeof TextInput>) {
  const { label, ...input } = props;

  return (
    <View className="gap-1">
      <Text className="text-legend text-muted dark:text-muted-night">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        className="min-h-11 rounded-sm border border-muted/30 px-3 text-body text-ink dark:text-ink-night"
        {...input}
      />
    </View>
  );
}

function Button({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      className={`min-h-11 items-center justify-center rounded-md px-4 ${secondary ? 'border border-primary' : 'bg-primary'} ${disabled ? 'opacity-50' : ''}`}>
      <Text className={`text-body font-bold ${secondary ? 'text-primary dark:text-primary-night' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-11 flex-1 items-center justify-center rounded-full border ${active ? 'border-primary bg-primary/10' : 'border-muted/30'}`}>
      <Text className={`text-body ${active ? 'font-bold text-primary dark:text-primary-night' : 'text-ink dark:text-ink-night'}`}>{label}</Text>
    </Pressable>
  );
}
