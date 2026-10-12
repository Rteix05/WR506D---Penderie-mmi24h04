import { Stack } from 'expo-router';

/**
 * Le look du jour :
 *
 *   index (prendre la photo) › [id] (poser les points) ─┬─ [id]/choisir (désigner un vêtement)
 *                                                        └─ [id]/post (les 2 images du post, l'état)
 *
 * Un vêtement absent du dressing s'ajoute par le parcours d'ajout,
 * pré-rempli par l'IA (ajout/look), puis revient au look.
 */
export default function LookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/post" />
      <Stack.Screen name="[id]/choisir" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
