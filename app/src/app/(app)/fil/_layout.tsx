import { Stack } from 'expo-router';

/**
 * Le fil d'actualité :
 *
 *   index (Fil | Mes publications) › [id] (une publication)
 *                                  › profil/[id] (la page d'un profil, ce qu'il te montre)
 *
 * On publie depuis le look du jour (look/[id]/publier).
 */
export default function FeedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="profil/[id]" />
    </Stack>
  );
}
