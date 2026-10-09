import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { analyzeImage, PICKER_OPTIONS, type ScanKind, type ScanResult } from '@/lib/scan';

/**
 * Écran de TEST du scan par IA : prendre ou choisir une photo, l'envoyer à
 * POST /api/scans/analyze et voir ce que le modèle a reconnu. Il sera
 * remplacé par le vrai parcours d'ajout de la maquette (scan → fiche
 * pré-remplie) ; d'ici là, il sert à mesurer la fiabilité du scan.
 *
 * Plus de formulaire de connexion ici : l'écran fait partie de l'app
 * connectée, et une session expirée renvoie seule vers la connexion.
 */
export default function ScanScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6">
        <View className="items-start gap-3">
          <Button label="← Fermer" variant="ghost" onPress={() => router.back()} />
          <ScreenTitle title="Tester le scan" />
        </View>
        <Scanner />
      </ScrollView>
    </SafeAreaView>
  );
}

function Scanner() {
  const [kind, setKind] = useState<ScanKind>('PHOTO');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scan = useMutation({
    mutationFn: (asset: ImagePicker.ImagePickerAsset) => analyzeImage(asset, kind),
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
        <Button label="Choisir dans la galerie" onPress={() => pick('library')} disabled={scan.isPending} variant="secondary" />
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
