import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useDraft } from '@/lib/add-draft';
import { cropOf, useLook } from '@/lib/look';

/**
 * Entrée du parcours d'ajout depuis un point du look du jour : le
 * brouillon de vêtement est pré-rempli par ce que l'IA a vu (nom,
 * catégorie, couleur, marque), avec le gros plan du point comme photo,
 * puis on passe au formulaire vêtement. À la vérification, le vêtement
 * créé est désigné pour ce point (Draft.lookLink).
 */
export default function AddFromLookScreen() {
  const { look: lookId, tag: tagId } = useLocalSearchParams<{ look: string; tag: string }>();
  const look = useLook(lookId);
  const { reset, update, applyScan } = useDraft();
  const prepared = useRef(false);

  useEffect(() => {
    if (!look.data || prepared.current) return;
    prepared.current = true;
    const tag = look.data.tags.find((t) => t.id === tagId);
    reset('garment');
    if (tag?.suggestion) {
      applyScan({ scanId: '', kind: 'PHOTO', status: 'SUCCESS', model: tag.model, suggestion: { ...tag.suggestion, type: 'GARMENT' }, error: null });
    }
    update({ kind: 'garment', photo: cropOf(tagId), lookLink: { look: lookId, tag: tagId } });
    router.replace('/ajout/vetement/infos');
  }, [look.data, tagId, lookId, reset, applyScan, update]);

  return (
    <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-night">
      <ActivityIndicator />
    </View>
  );
}
