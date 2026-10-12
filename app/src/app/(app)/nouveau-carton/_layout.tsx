import { Stack } from 'expo-router';

import { BoxDraftProvider } from '@/lib/box-draft';

/**
 * Parcours « Créer un carton » (Figma, « Rangement — Création ») :
 *
 *   infos › emplacement › verification
 *
 * Ouvert depuis « Mes cartons », le menu d'ajout (« Cartons ») et le menu
 * de l'onglet Logements.
 */
export default function NewBoxLayout() {
  return (
    <BoxDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </BoxDraftProvider>
  );
}
