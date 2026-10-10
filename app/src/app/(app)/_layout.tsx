import { Stack } from 'expo-router';

/**
 * L'app connectée : les onglets, et par-dessus les écrans qui s'ouvrent
 * depuis plusieurs endroits (choix du type, parcours d'ajout…).
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ajouter" options={{ presentation: 'modal' }} />
      {/* Parcours d'ajout (scan, objet, vêtement) : une modale qui empile ses étapes. */}
      <Stack.Screen name="ajout" options={{ presentation: 'modal' }} />
      {/* Fiches de l'inventaire, et leur modification par-dessus. */}
      <Stack.Screen name="objet/[id]" />
      <Stack.Screen name="vetement/[id]" />
      <Stack.Screen name="modifier" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
