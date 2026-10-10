import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/inventory/EmptyState';
import { FilterChips, SearchField, SortChip } from '@/components/inventory/ListControls';
import { PossessionCard } from '@/components/inventory/PossessionCard';
import { BackButton } from '@/components/ui/BackButton';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import {
  artOf,
  AVAILABILITY,
  normalize,
  rootCategory,
  SORTS,
  sortPossessions,
  STATUS_FILTERS,
  usePossessions,
  type Availability,
  type Possession,
  type Sort,
} from '@/lib/possessions';
import { useBrands, useColors, useGarmentCategories, useSizes } from '@/lib/reference';

const ALL = '*';
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * « Mon dressing » (Figma « Vêtement — Dressing », 135:3217) : recherche
 * (nom, marque, catégorie, couleur), puces de catégorie, filtre de statut,
 * tri, et la grille en quinconce : deux colonnes, photos de 230 et 170 de
 * haut en alternance, décalées d'une colonne à l'autre.
 *
 * Écarts : « Porté il y a 3 j » attend l'historique de port (pas encore de
 * route d'API) ; « Filtres » ouvre pour l'instant le filtre de statut.
 */
export default function DressingScreen() {
  const garments = usePossessions('garment');
  const categories = useGarmentCategories();
  const brands = useBrands();
  const colors = useColors();
  const sizes = useSizes();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  const [status, setStatus] = useState<Availability | typeof ALL>(ALL);
  const [sort, setSort] = useState<Sort>('recent');

  const all = useMemo(() => garments.data ?? [], [garments.data]);
  const name = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of [categories.data, brands.data, colors.data]) for (const r of list ?? []) map.set(r.iri, r.name);
    for (const scale of sizes.data?.values() ?? []) for (const v of scale) map.set(v.iri, v.name);

    return (iri: string | null | undefined) => (iri ? (map.get(iri) ?? null) : null);
  }, [categories.data, brands.data, colors.data, sizes.data]);

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
      if (category !== ALL && rootCategory(categories.data, p.category)?.iri !== category) return false;
      if (status !== ALL && p.availability !== status) return false;
      const words = [p.name, p.description ?? '', name(p.brand) ?? '', name(p.category) ?? '', ...(p.colors ?? []).map((c) => name(c) ?? '')];

      return q === '' || words.some((text) => normalize(text).includes(q));
    });

    return sortPossessions(filtered, sort);
  }, [all, categories.data, name, query, category, status, sort]);

  const lent = all.filter((p) => p.availability === 'LENT').length;
  const legend = garments.data ? [plural(all.length, 'vêtement', 'vêtements'), lent > 0 && plural(lent, 'prêté', 'prêtés')].filter(Boolean).join(' · ') : ' ';
  const statusOptions = STATUS_FILTERS.map((s) => ({ value: (s.value ?? ALL) as Availability | typeof ALL, label: s.label }));

  // Quinconce de la maquette : colonne A 230, 170, 230… ; colonne B 170, 230, 170…
  const columns: [Possession, number][][] = [[], []];
  shown.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    columns[col].push([p, (row + col) % 2 === 0 ? 230 : 170]);
  });

  const card = ([p, height]: [Possession, number]) => {
    const state = AVAILABILITY[p.availability];

    return (
      <PossessionCard
        key={p.id}
        name={p.name}
        meta={[name(p.brand), name(p.category), name(p.size) ?? p.sizeLabel].filter(Boolean).join(' · ')}
        photo={p.photos?.[0]}
        art={artOf('garment', p, categories.data)}
        photoHeight={height}
        // Comme dans la maquette, un vêtement disponible n'a pas de pastille.
        badge={p.availability === 'AVAILABLE' ? undefined : { label: state.label, className: state.solid }}
        onPress={() => router.push({ pathname: '/vetement/[id]', params: { id: p.id } })}
      />
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-14 pt-5" keyboardShouldPersistTaps="handled">
        <View className="h-11 flex-row items-center px-5">
          <BackButton />
        </View>
        <View className="px-5">
          <ScreenTitle title="Mon dressing" legend={shown.length === 0 && all.length > 0 ? 'Aucun résultat' : legend} />
        </View>

        {garments.isPending && <ActivityIndicator className="pt-8" />}
        {garments.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{garments.error.message}</Text>}

        {garments.data && all.length === 0 && (
          <EmptyState
            icon="hanger"
            title="Ton dressing est vide"
            text="Ajoute ton premier vêtement : il entrera dans tes tenues et tu sauras où il est rangé."
            action={{ label: 'Ajouter un vêtement', glyph: '+', onPress: () => router.push('/ajout/vetement/type') }}
          />
        )}

        {all.length > 0 && (
          <>
            <SearchField value={query} onChange={setQuery} placeholder="Rechercher un vêtement, une marque..." />
            <View className="gap-3">
              <FilterChips options={chips} value={category} onChange={setCategory} />
              <View className="flex-row items-center justify-between px-5">
                <SortChip prefix="Filtres :" title="Statut" options={statusOptions} value={status} onChange={setStatus} />
                <SortChip prefix="Trier :" title="Trier" options={SORTS} value={sort} onChange={setSort} />
              </View>
            </View>

            {shown.length === 0 ? (
              <EmptyState
                icon="hanger"
                title="Aucun vêtement trouvé"
                text="Aucun vêtement ne correspond à ta recherche. Vérifie l'orthographe ou essaie un autre mot."
                action={{
                  label: 'Effacer la recherche',
                  onPress: () => {
                    setQuery('');
                    setCategory(ALL);
                    setStatus(ALL);
                  },
                }}
              />
            ) : (
              <View className="flex-row gap-3 px-5">
                <View className="flex-1 gap-3">{columns[0].map(card)}</View>
                <View className="flex-1 gap-3">{columns[1].map(card)}</View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
