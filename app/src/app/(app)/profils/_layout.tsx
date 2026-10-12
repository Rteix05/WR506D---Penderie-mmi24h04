import { Stack } from 'expo-router';

/**
 * Les profils du compte (Figma, section « 12 · Compte ») :
 *
 *   index (Changer de profil) ─┬─ nouveau (Nouveau profil) › [id]/autorisations
 *                               └─ [id] (Profil famille) ─┬─ [id]/modifier
 *                                                         └─ [id]/autorisations
 *
 * La pile s'ouvre en modale par-dessus les onglets (« X » pour fermer).
 */
export default function ProfilesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
