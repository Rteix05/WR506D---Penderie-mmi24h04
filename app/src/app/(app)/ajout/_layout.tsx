import { Stack } from 'expo-router';

import { DraftProvider } from '@/lib/add-draft';

/**
 * Parcours d'ajout, d'après Figma (page « Maquette v2 ») :
 *
 *   scan ─┬─ analyse ─┬─ resultat ─┬─ objet/infos › emplacement › verification › confirmation
 *         │           └─ echec     └─ vetement/infos (si le scan voit un vêtement)
 *         └─ « Ajouter manuellement » → objet/infos
 *   vetement/type › infos › emplacement › verification › confirmation
 *
 * Toutes les étapes partagent un brouillon (DraftProvider) : rien n'est
 * envoyé à l'API avant « Ajouter » à la vérification.
 */
export default function AddFlowLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Une fois l'objet créé, on ne revient pas en arrière sur le formulaire. */}
        <Stack.Screen name="objet/confirmation" options={{ gestureEnabled: false }} />
        <Stack.Screen name="vetement/confirmation" options={{ gestureEnabled: false }} />
      </Stack>
    </DraftProvider>
  );
}
