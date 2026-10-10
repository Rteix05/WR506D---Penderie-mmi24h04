import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/inventory/EmptyState';
import { FilterChips, SearchField, SortChip } from '@/components/inventory/ListControls';
import { PossessionCard } from '@/components/inventory/PossessionCard';
import { useOpenAddMenu } from '@/components/nav/AddMenu';
import { BackButton } from '@/components/ui/BackButton';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import {
  artOf,
  AVAILABILITY,
  normalize,
  rootCategory,
  roomName,
  sortPossessions,
  SORTS,
  STATUS_FILTERS,
  usePossessions,
  type Availability,
  type Possession,
  type Sort,
} from '@/lib/possessions';
import { useItemCategories, useLocations } from '@/lib/reference';

const ALL = '*';
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * « Mes objets » (Figma « Objet — Mes objets », 135:2156) : recherche,
 * puces de catégorie, statut et tri, grille de cartes à deux colonnes.
 *
 * Écarts avec la maquette :
 *  - la puce « Vêtements » n'y est pas : les vêtements ont leur page,
 *    « Mon dressing » ;
 *  - les puces de catégorie sont les catégories de premier niveau que tu
 *    utilises vraiment (la maquette en montre des exemples) ;
 *  - la ligne « Prêté à Thomas » attend les routes de prêt de l'API : la
 *    pastille dit déjà « Prêté ».
 */
export default function ItemsScreen() {
  const items = usePossessions('item');
  const categories = useItemCategories();
  const locations = useLocations();
  const openAdd = useOpenAddMenu();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  const [status, setStatus] = useState<Availability | typeof ALL>(ALL);
  const [sort, setSort] = useState<Sort>('recent');

  const all = useMemo(() => items.data ?? [], [items.data]);
  const rootOf = (p: Possession) => rootCategory(categories.data, p.category);
  const chips = useMemo(() => {
    const used = new Map<string, string>();
    for (const p of all) {
      const root = rootCategory(categories.data, p.category);
      if (root) used.set(root.iri, root.name);
    }

    return [{ value: ALL, label: 'Tous' }, ...[...used].sort((a, b) => a[1].localeCompare(b[1], 'fr')).map(([value, label]) => ({ value, label }))];
  }, [all, categories.data]);

  const shown = useMemo(() => {
    const q = normalize(query);
    const filtered = all.filter((p) => {
      const root = rootCategory(categories.data, p.category);
      const own = categories.data?.find((c) => c.iri === p.category);
      if (category !== ALL && root?.iri !== category) return false;
      if (status !== ALL && p.availability !== status) return false;

      return q === '' || [p.name, p.description ?? '', own?.name ?? '', roomName(locations.data, p) ?? ''].some((text) => normalize(text).includes(q));
    });

    return sortPossessions(filtered, sort);
  }, [all, categories.data, locations.data, query, category, status, sort]);

  const lent = all.filter((p) => p.availability === 'LENT').length;
  const borrowed = all.filter((p) => p.availability === 'BORROWED').length;
  const legend = items.data
    ? [plural(all.length, 'objet', 'objets'), lent > 0 && plural(lent, 'prêté', 'prêtés'), borrowed > 0 && plural(borrowed, 'emprunté', 'empruntés')].filter(Boolean).join(' · ')
    : ' ';

  const statusOptions = STATUS_FILTERS.map((s) => ({ value: (s.value ?? ALL) as Availability | typeof ALL, label: s.label }));
  const rows: Possession[][] = [];
  for (let i = 0; i < shown.length; i += 2) rows.push(shown.slice(i, i + 2));

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-14 pt-5" keyboardShouldPersistTaps="handled">
        <View className="h-11 flex-row items-center px-5">
          <BackButton />
        </View>
        <View className="px-5">
          <ScreenTitle title="Mes objets" legend={legend} />
        </View>

        {items.isPending && <ActivityIndicator className="pt-8" />}
        {items.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{items.error.message}</Text>}

        {items.data && all.length === 0 && (
          <EmptyState
            icon="search"
            title="Ta penderie est vide"
            text="Ajoute ton premier objet : tu sauras toujours où il est rangé et à qui tu l'as prêté."
            action={{ label: 'Ajouter un objet', glyph: '+', onPress: openAdd }}
          />
        )}

        {all.length > 0 && (
          <>
            <SearchField value={query} onChange={setQuery} placeholder="Rechercher un objet..." />
            <View className="gap-3">
              <FilterChips options={chips} value={category} onChange={setCategory} />
              <View className="flex-row items-center justify-between px-5">
                <SortChip prefix="Statut :" title="Statut" options={statusOptions} value={status} onChange={setStatus} />
                <SortChip prefix="Trier :" title="Trier" options={SORTS} value={sort} onChange={setSort} />
              </View>
            </View>

            {shown.length === 0 ? (
              <EmptyState
                icon="search"
                title="Aucun objet trouvé"
                text="Aucun objet ne correspond à ta recherche. Vérifie l'orthographe ou essaie un autre mot."
                action={{
                  label: 'Tout afficher',
                  onPress: () => {
                    setQuery('');
                    setCategory(ALL);
                    setStatus(ALL);
                  },
                }}
              />
            ) : (
              <View className="gap-3 px-5">
                {rows.map((row) => (
                  <View key={row[0].id} className="flex-row gap-3">
                    {row.map((p) => {
                      const state = AVAILABILITY[p.availability];
                      const room = roomName(locations.data, p);

                      return (
                        <View key={p.id} className="flex-1">
                          <PossessionCard
                            name={p.name}
                            meta={[categories.data?.find((c) => c.iri === p.category)?.name ?? rootOf(p)?.name, room ?? 'sans emplacement'].filter(Boolean).join(' · ')}
                            photo={p.photos?.[0]}
                            art={artOf('item', p, categories.data)}
                            photoHeight={187}
                            badge={{ label: state.label, className: state.solid }}
                            onPress={() => router.push({ pathname: '/objet/[id]', params: { id: p.id } })}
                          />
                        </View>
                      );
                    })}
                    {row.length === 1 && <View className="flex-1" />}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

