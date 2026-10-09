import { Stack } from 'expo-router';

/**
 * L'app connectée : les onglets, et par-dessus les écrans qui s'ouvrent
 * depuis plusieurs onglets (le scan, plus tard les fiches objet…).
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ajouter" options={{ presentation: 'modal' }} />
      <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
