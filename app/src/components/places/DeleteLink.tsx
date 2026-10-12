import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';

/**
 * Lien rouge de suppression (Figma « Supprimer ce carton ») : demande
 * confirmation, puis lance la suppression ; l'échec (refus de l'API)
 * s'affiche dans une alerte.
 */
export function DeleteLink({ label, what, name, detail, onConfirm }: { label: string; what: string; name: string; detail?: string; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  const ask = () =>
    Alert.alert(`Supprimer ${what} ?`, [`« ${name} » disparaîtra de tes logements.`, detail].filter(Boolean).join(' '), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await onConfirm();
          } catch (e) {
            setBusy(false);
            Alert.alert('Suppression impossible', e instanceof Error ? e.message : '');
          }
        },
      },
    ]);

  return (
    <Pressable accessibilityRole="button" onPress={ask} disabled={busy} hitSlop={8} className="self-center py-1">
      <Text className={`font-luciole-bold text-legend text-error dark:text-error-night ${busy ? 'opacity-50' : ''}`}>{busy ? 'Suppression…' : label}</Text>
    </Pressable>
  );
}
