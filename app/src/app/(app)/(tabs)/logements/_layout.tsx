import { Stack } from 'expo-router';

/**
 * Onglet Logements : on descend logement › pièce › rangement, et l'on
 * remonte avec le retour. Une pile à l'intérieur de l'onglet garde la
 * barre de navigation sous chaque page, comme dans la maquette.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function PlacesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
