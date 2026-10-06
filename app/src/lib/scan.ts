import { File } from 'expo-file-system';
import { SaveFormat, ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { apiUpload } from '@/lib/api';

/** Les deux modes de scan qui passent par l'IA (POST /api/scans/analyze). */
export type ScanKind = 'PHOTO' | 'LABEL_OCR';

export type ScanSuggestion = {
  type: 'GARMENT' | 'ITEM';
  name: string | null;
  description: string | null;
  category: { iri: string; slug: string; name: string } | null;
  brand: { iri: string | null; name: string } | null;
  colors: { iri: string; name: string }[];
  size: string | null;
  composition: { material: string; percent: number | null }[];
  care: string[];
  madeIn: string | null;
  confidence: number | null;
};

export type ScanResult = {
  scanId: string;
  kind: ScanKind;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  model: string | null;
  suggestion: ScanSuggestion | null;
  error: string | null;
};

/** Assez pour lire une étiquette, et 5 à 10 fois plus léger qu'une photo brute. */
const MAX_WIDTH = 1280;

/**
 * Réduit la photo et la convertit en JPEG avant l'envoi : l'API refuse le
 * HEIC des iPhone et les fichiers de plus de 8 Mo, et une image plus petite
 * part plus vite vers le modèle.
 */
async function prepare(uri: string, width: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (width > MAX_WIDTH) {
    context.resize({ width: MAX_WIDTH });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

  return saved.uri;
}

/**
 * Si la conversion échoue (vu sur iPhone dans Expo Go), on envoie la photo
 * telle que le sélecteur l'a rendue : il la fournit déjà en JPEG compressé
 * (voir PICKER_OPTIONS), et l'API vérifie de toute façon le format.
 */
async function prepareOrOriginal(uri: string, width: number, mimeType: string | undefined): Promise<{ uri: string; type: string }> {
  try {
    return { uri: await prepare(uri, width), type: 'image/jpeg' };
  } catch (error) {
    console.warn('[scan] conversion JPEG impossible, envoi de la photo d’origine', error);

    return { uri, type: mimeType ?? 'image/jpeg' };
  }
}

/**
 * Options du sélecteur (appareil photo et galerie). Sur iPhone :
 *  - quality < 1 force un JPEG compressé, au lieu du HEIC natif ;
 *  - Compatible demande à la galerie la version la plus compatible (JPEG)
 *    d'une photo stockée en HEIC.
 */
export const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export async function analyzeImage(asset: ImagePicker.ImagePickerAsset, kind: ScanKind): Promise<ScanResult> {
  const file = await prepareOrOriginal(asset.uri, asset.width, asset.mimeType);
  const name = file.type === 'image/png' ? 'scan.png' : 'scan.jpg';
  const form = new FormData();
  form.append('kind', kind);
  if (Platform.OS === 'web') {
    // Sur le web, l'URI est un blob: ou data: : on envoie le fichier lui-même.
    form.append('image', await (await fetch(file.uri)).blob(), name);
  } else {
    // Sur téléphone, le fetch d'Expo (SDK 57) refuse l'objet { uri, name, type }
    // de React Native (« Unsupported FormDataPart implementation ») : il attend
    // un Blob, ce qu'est le File d'expo-file-system.
    form.append('image', new File(file.uri), name);
  }

  return apiUpload<ScanResult>('/api/scans/analyze', form);
}
