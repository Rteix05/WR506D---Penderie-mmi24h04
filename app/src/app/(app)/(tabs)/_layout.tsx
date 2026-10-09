import { router, Tabs } from 'expo-router';
import { Pressable, useColorScheme, View, type ColorValue } from 'react-native';

import { PlusIcon, TabIcon, type TabIconName } from '@/components/nav/TabIcon';

/** Couleurs du DS (tailwind.config.js) : le style des onglets ne passe pas par className. */
const COLORS = {
  light: { active: '#D31D66', inactive: '#475569', bar: '#FFFFFF' },
  dark: { active: '#FF6098', inactive: '#9BA7B8', bar: '#1B1F26' },
} as const;

function icon(name: TabIconName) {
  return function TabBarIcon({ color }: { color: ColorValue }) {
    return <TabIcon name={name} color={color} />;
  };
}

/**
 * Barre de navigation de la maquette (docs/accueil-final.png) : Accueil ·
 * Inventaire · [+] · Logements · Profil. Le « + » central n'est pas un
 * onglet : il ouvre l'ajout d'un objet (pour l'instant, le scan).
 *
 * Dans la maquette, Inventaire et Profil ouvrent un menu en panneau
 * (nav-menu-*.png) ; ici, ce menu est le contenu de l'onglet.
 */
export default function TabsLayout() {
  const colors = COLORS[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontSize: 12, fontFamily: 'Luciole-Bold' },
        tabBarStyle: {
          backgroundColor: colors.bar,
          borderTopWidth: 0,
          // e-2 du DS : la barre de nav est le seul élément élevé de l'écran.
          shadowColor: '#1A1E24',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="inventaire" options={{ title: 'Inventaire', tabBarIcon: icon('inventory') }} />
      <Tabs.Screen
        name="ajouter"
        options={{
          title: 'Ajouter',
          tabBarButton: () => <AddButton />,
        }}
      />
      <Tabs.Screen name="logements" options={{ title: 'Logements', tabBarIcon: icon('places') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('profile') }} />
    </Tabs>
  );
}

/** Nav / FAB : le bouton rond qui dépasse de la barre. */
function AddButton() {
  return (
    <View className="flex-1 items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter un objet"
        onPress={() => router.push('/scan')}
        className="-mt-6 h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-80"
        style={{ shadowColor: '#1A1E24', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
        <PlusIcon color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
