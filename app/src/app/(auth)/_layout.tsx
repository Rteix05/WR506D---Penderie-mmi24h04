import { Stack } from 'expo-router';

// Hors connexion, on arrive toujours sur l'écran de connexion ; l'inscription
// s'empile par-dessus (retour possible).
export const unstable_settings = { initialRouteName: 'connexion' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
