import { Stack } from 'expo-router';

import { PlaceDraftProvider } from '@/lib/place-draft';

/**
 * Parcours « Ajouter un logement » (Figma, section 04) :
 *
 *   type › infos › pieces › verification
 *
 * Ouvert depuis « Mes logements », le menu d'ajout (« Logement ») et la
 * vue d'un logement absent. Les étapes partagent un brouillon.
 */
export default function NewPlaceLayout() {
  return (
    <PlaceDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PlaceDraftProvider>
  );
}
