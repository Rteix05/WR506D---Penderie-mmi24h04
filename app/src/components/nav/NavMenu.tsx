import { router } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { SECTIONS, type Section } from '@/components/nav/sections';
import { E2 } from '@/components/ui/elevation';
import { MenuRow } from '@/components/ui/MenuRow';

type Props = {
  section: Section;
  onClose: () => void;
};

/**
 * Panneau qu'un onglet déplie (Figma « Accueil — Menu · <onglet> », lot 28) :
 * voile encre à 55 % sur l'écran (la barre reste visible et utilisable),
 * panneau blanc à 12 px des bords et 36 px au-dessus de la barre, rayon 24,
 * titre Typolio 24 et légende, puis les lignes.
 *
 * Toucher le voile, le même onglet ou le bouton retour Android le ferme ;
 * un autre onglet bascule sur son panneau (géré par le layout).
 */
export function NavMenu({ section, onClose }: Props) {
  const menu = SECTIONS[section];

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();

      return true;
    });

    return () => sub.remove();
  }, [onClose]);

  // Les Animated.View de Reanimated ne passent pas par NativeWind : leur
  // placement est en style, les classes vont sur les View intérieures.
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer le menu" onPress={onClose} className="absolute inset-0 bg-ink/[0.55]" />
      <Animated.View key={section} entering={SlideInDown.duration(200)} exiting={SlideOutDown.duration(150)} style={{ position: 'absolute', left: 12, right: 12, bottom: 36 }}>
        <View accessibilityViewIsModal style={E2} className="gap-2 rounded-lg bg-surface px-4 pb-4 pt-5 dark:bg-surface-night">
          <View className="gap-0.5 pb-2">
            <Text accessibilityRole="header" className="font-typolio text-h4 uppercase text-ink dark:text-ink-night">
              {section}
            </Text>
            <Text className="font-luciole text-legend text-muted dark:text-muted-night">{menu.legend}</Text>
          </View>
          {menu.entries.map((entry) => (
            <MenuRow
              key={entry.title}
              title={entry.title}
              subtitle={entry.subtitle}
              onPress={
                entry.href
                  ? () => {
                      onClose();
                      router.navigate(entry.href!);
                    }
                  : undefined
              }
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
