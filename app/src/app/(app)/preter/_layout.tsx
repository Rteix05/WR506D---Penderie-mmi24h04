import { Stack } from 'expo-router';

import { LoanDraftProvider } from '@/lib/loan-draft';

/**
 * Parcours « Prêter » (maquette, lot 05 « Prêts », écrans 1 à 3) :
 *
 *   index (à qui ?) › infos (retour, note) › verification
 *
 * Ouvert depuis la fiche d'un objet ou d'un vêtement disponible, par son
 * propriétaire. La confirmation est la fiche du prêt créé.
 */
export default function LendLayout() {
  return (
    <LoanDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </LoanDraftProvider>
  );
}
