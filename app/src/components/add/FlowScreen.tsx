import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Ferme tout le parcours d'ajout et revient aux pages principales. */
export function closeFlow() {
  router.dismissTo('/');
}

/**
 * Enveloppe d'un écran d'ajout : fond, zone de sécurité, défilement, clavier,
 * et l'espacement vertical de 24 entre les blocs (Figma « Contenu »).
 */
export function FlowScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="gap-6 pb-10 pt-5" keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Barre d'actions du DS (« Detail/Action bar ») : boutons empilés, note centrée en dessous. */
export function ActionBar({ children, note }: PropsWithChildren<{ note?: string }>) {
  return (
    <View className="gap-3 px-5">
      {children}
      {note && <Text className="text-center font-luciole text-legend text-muted dark:text-muted-night">{note}</Text>}
    </View>
  );
}
