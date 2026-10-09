import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { PICKER_OPTIONS } from '@/lib/scan';

/**
 * Prend une photo (appareil photo) ou en choisit une (galerie). Renvoie
 * null si la personne annule ou refuse l'accès ; dans ce dernier cas, on
 * lui dit comment l'autoriser.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Appareil photo', "L'accès à l'appareil photo est refusé : autorise-le dans les réglages du téléphone.");

      return null;
    }
  }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  return result.canceled ? null : result.assets[0];
}
