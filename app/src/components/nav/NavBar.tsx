import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon, type TabIconName } from '@/components/nav/TabIcon';
import { ORDER, type Section } from '@/components/nav/sections';
import { E2 } from '@/components/ui/elevation';

const ICON: Record<Section, TabIconName> = {
  Accueil: 'home',
  Inventaire: 'inventory',
  Logements: 'places',
  Profil: 'profile',
};

/** Hauteur de la barre hors zone de sécurité (lib Figma : NAVH = 72). */
export const NAV_HEIGHT = 72;

type Props = {
  /** Onglet allumé : celui du panneau ouvert, sinon celui de la page. */
  active: Section;
  /** Panneau ouvert, pour l'état « déplié » annoncé au lecteur d'écran. */
  open: Section | null;
  onTabPress: (section: Section) => void;
};

/**
 * Barre de navigation de la maquette (Figma, « Nav » de l'accueil 135:1797) :
 * 72 px, blanche, filet encre 7 % en haut, quatre onglets de 68 × 48 et le
 * bouton « + » de 60 px qui dépasse de 24 px au centre.
 *
 * Un onglet ne change pas de page : il déplie son panneau (le chevron
 * « ^ » le signale). C'est le panneau qui mène aux pages.
 */
export function NavBar({ active, open, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const tabs = ORDER.map((section) => <Tab key={section} section={section} active={section === active} expanded={section === open} onPress={() => onTabPress(section)} />);

  return (
    <View style={[E2, { height: NAV_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]} className="border-t border-ink/[0.07] bg-surface dark:border-ink-night/10 dark:bg-surface-night">
      <View className="flex-1 flex-row items-center justify-between px-2">
        {tabs[0]}
        {tabs[1]}
        <View className="h-12 w-16" />
        {tabs[2]}
        {tabs[3]}
      </View>
      <AddButton />
    </View>
  );
}

function Tab({ section, active, expanded, onPress }: { section: Section; active: boolean; expanded: boolean; onPress: () => void }) {
  const color = active ? 'text-primary dark:text-primary-night' : 'text-muted/[0.85] dark:text-muted-night';
  const iconColor = active ? '#D31D66' : 'rgba(71, 85, 105, 0.85)';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${section}, menu`}
      accessibilityState={{ selected: active, expanded }}
      onPress={onPress}
      className="h-12 w-[68px] items-center justify-center gap-1">
      <TabIcon name={ICON[section]} color={iconColor} />
      <Text className={`font-luciole-bold text-legend ${color}`}>{section}</Text>
      {/* Chevron « s'ouvre vers le haut » : « › » tourné de -90°. */}
      <Text className={`absolute left-[54px] top-[2px] font-luciole-bold text-legend ${color}`} style={{ transform: [{ rotate: '-90deg' }] }} accessible={false}>
        ›
      </Text>
    </Pressable>
  );
}

/**
 * Le « + » central (composant Figma « Add activity ») : rond rose de 60 px,
 * liseré couleur du fond, croix de 29 px aux barres arrondies. Il ouvre
 * l'ajout (pour l'instant le scan ; le menu d'ajout radial viendra).
 */
function AddButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ajouter"
      onPress={() => router.push('/scan')}
      style={E2}
      className="absolute -top-6 left-1/2 -ml-[30px] h-[60px] w-[60px] items-center justify-center rounded-full border-[2.667px] border-bg bg-primary active:opacity-80 dark:border-bg-night">
      <View className="h-[29.333px] w-[29.333px]">
        <View className="absolute left-0 top-[11.33px] h-[6.667px] w-[29.333px] rounded-[3.333px] bg-bg" />
        <View className="absolute left-[11.33px] top-0 h-[29.333px] w-[6.667px] rounded-[3.333px] bg-bg" />
      </View>
    </Pressable>
  );
}
