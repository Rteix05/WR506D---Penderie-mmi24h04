import { router, type Href } from 'expo-router';
import { createContext, use, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Heading } from '@/components/ui/Heading';
import { E2 } from '@/components/ui/elevation';
import i18n from '@/i18n';

/**
 * Ouvre le menu d'ajout depuis n'importe quelle page principale : le « + »
 * de la barre, et le bouton « Ajouter » de l'accueil (dans le prototype,
 * les deux mènent au même menu).
 */
export const AddMenuContext = createContext<(() => void) | null>(null);

export function useOpenAddMenu(): () => void {
  const open = use(AddMenuContext);
  if (open === null) {
    throw new Error(i18n.t('common:addMenu.contextError'));
  }

  return open;
}

type Bubble = {
  /** Lettres des pastilles (la maquette n'a pas d'icônes ici, des initiales). */
  letters: string[];
  title: string;
  description: string;
  /** Destination ; sans href, le parcours n'est pas encore construit. */
  href?: Href;
};

/**
 * Menu d'ajout du « + » (Figma 135:1848) : voile encre à 58 % sur TOUT
 * l'écran, barre comprise ; « Qu'est-ce que tu ajoutes ? » en Typolio 24
 * blanc ; quatre bulles blanches en grille 2 × 2 (311 de large, 31 entre
 * les colonnes, 21 entre les lignes) ; le « + » devient un « − » avec
 * « Fermer » dessous. Le voile, le « − » et le retour Android ferment.
 */
export function AddMenu({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  // Contenu et ordre de Figma (« Accueil — Menu d'ajout », node 135:1848).
  // Destinations du prototype : choix du type, création de carton, type de
  // logement, scan.
  const bubbles: Bubble[] = [
    { letters: ['V', 'O'], title: t('addMenu.bubbles.clothes.title'), description: t('addMenu.bubbles.clothes.description'), href: '/ajouter' },
    { letters: ['C'], title: t('addMenu.bubbles.boxes.title'), description: t('addMenu.bubbles.boxes.description'), href: '/nouveau-carton/infos' },
    { letters: ['L'], title: t('addMenu.bubbles.place.title'), description: t('addMenu.bubbles.place.description'), href: '/nouveau-logement/type' },
    { letters: ['S'], title: t('addMenu.bubbles.scan.title'), description: t('addMenu.bubbles.scan.description'), href: '/ajout/scan' },
  ];

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();

      return true;
    });

    return () => sub.remove();
  }, [onClose]);

  const choose = (bubble: Bubble) => {
    if (!bubble.href) {
      Alert.alert(bubble.title, t('addMenu.soon'));

      return;
    }
    onClose();
    router.push(bubble.href);
  };

  // Le « − » prend exactement la place du « + » de la barre (24 px au-dessus
  // du haut de la barre de 72) : bas du rond = zone de sécurité + 72 - 60 + 24.
  const fabBottom = insets.bottom + 36;

  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('addMenu.closeMenu')} onPress={onClose} className="absolute inset-0 bg-ink/[0.58]" />

      <View accessibilityViewIsModal pointerEvents="box-none" className="absolute left-0 right-0 items-center gap-6" style={{ bottom: fabBottom + 60 + 6 }}>
        <Heading level="h4" accessibilityRole="header" className="w-[353px] text-center uppercase text-white">
          {t('addMenu.title')}
        </Heading>
        <View className="w-[311px] gap-[21px]">
          <View className="flex-row gap-[31px]">
            <BubbleCard bubble={bubbles[0]} index={0} onPress={choose} />
            <BubbleCard bubble={bubbles[1]} index={1} onPress={choose} />
          </View>
          <View className="flex-row gap-[31px]">
            <BubbleCard bubble={bubbles[2]} index={2} onPress={choose} />
            <BubbleCard bubble={bubbles[3]} index={3} onPress={choose} />
          </View>
        </View>
      </View>

      {/* Composant Figma « Add activity », état ouvert : « − » sur liseré de 4. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('addMenu.close')}
        onPress={onClose}
        style={{ bottom: fabBottom }}
        className="absolute left-1/2 -ml-[30px] h-[60px] w-[60px] items-center justify-center rounded-full border-4 border-bg bg-primary active:opacity-80">
        <View className="h-[7px] w-[44px] rounded-[3px] bg-bg" />
      </Pressable>
      <Text accessible={false} style={{ bottom: insets.bottom + 8 }} className="absolute left-0 right-0 text-center font-luciole-bold text-legend text-white">
        {t('addMenu.close')}
      </Text>
    </Animated.View>
  );
}

/** Bulle (Figma « Bulle … ») : carte blanche, rayon 16, ombre e-2, pastilles de 36 rose 12 %. */
function BubbleCard({ bubble, index, onPress }: { bubble: Bubble; index: number; onPress: (b: Bubble) => void }) {
  const { t } = useTranslation('common');

  return (
    <Animated.View entering={ZoomIn.delay(40 * index).duration(180)} style={{ flex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          bubble.href
            ? t('addMenu.bubbleLabel', { title: bubble.title, description: bubble.description })
            : t('addMenu.bubbleLabelSoon', { title: bubble.title, description: bubble.description })
        }
        onPress={() => onPress(bubble)}
        style={E2}
        className="flex-1 gap-1 rounded-md bg-surface p-3 active:opacity-80 dark:bg-surface-night">
        <View className="flex-row gap-1">
          {bubble.letters.map((letter) => (
            <View key={letter} className="h-9 w-9 items-center justify-center rounded-full bg-primary/[0.12]">
              <Text className="font-luciole-bold text-[14px] text-primary dark:text-primary-night">{letter}</Text>
            </View>
          ))}
        </View>
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{bubble.title}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{bubble.description}</Text>
      </Pressable>
    </Animated.View>
  );
}
