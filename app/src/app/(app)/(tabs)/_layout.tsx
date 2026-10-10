import { Tabs, usePathname } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AddMenu, AddMenuContext } from '@/components/nav/AddMenu';
import { NavBar } from '@/components/nav/NavBar';
import { NavMenu } from '@/components/nav/NavMenu';
import { sectionOf, type Section } from '@/components/nav/sections';

/**
 * Les pages principales et la navigation de la maquette (lot 28) : la
 * barre maison sous les pages, et le panneau de l'onglet touché par-dessus.
 *
 * Tabs garde les pages montées (on revient à l'accueil sans le recharger),
 * mais sa barre par défaut est remplacée : dans la maquette, un onglet ne
 * change pas de page, il déplie un panneau (voir NavBar, NavMenu).
 *
 * Ordre de rendu = ordre d'empilement : pages, puis voile et panneau, puis
 * barre — la barre et le « + » restent au-dessus du voile des panneaux,
 * comme dans Figma — puis le menu d'ajout, dont le voile couvre la barre.
 */
export default function TabsLayout() {
  const pathname = usePathname();
  const [open, setOpen] = useState<Section | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const [adding, setAdding] = useState(false);
  const openAdd = useCallback(() => {
    setOpen(null);
    setAdding(true);
  }, []);
  const closeAdd = useCallback(() => setAdding(false), []);

  // Même onglet : referme. Autre onglet : bascule sur son panneau.
  const onTabPress = (section: Section) => setOpen((current) => (current === section ? null : section));

  return (
    <AddMenuContext value={openAdd}>
      <View className="flex-1 bg-bg dark:bg-bg-night">
        <View className="flex-1">
          <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="objets" />
            <Tabs.Screen name="dressing" />
            <Tabs.Screen name="profil" />
          </Tabs>
          {open && <NavMenu section={open} onClose={close} />}
        </View>
        <NavBar active={open ?? sectionOf(pathname)} open={open} onTabPress={onTabPress} onAddPress={openAdd} />
        {/* Le menu d'ajout couvre aussi la barre (voile plein écran dans Figma). */}
        {adding && <AddMenu onClose={closeAdd} />}
      </View>
    </AddMenuContext>
  );
}
