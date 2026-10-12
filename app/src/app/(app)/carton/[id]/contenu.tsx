import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { FlowScreen } from '@/components/add/FlowScreen';
import { EmptyState } from '@/components/inventory/EmptyState';
import { FilterChips, SearchField } from '@/components/inventory/ListControls';
import { Loading, Missing, PossessionRow } from '@/components/places/Blocks';
import { BackButton } from '@/components/ui/BackButton';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { normalize } from '@/lib/possessions';
import { inBox, objects, usePlacesData } from '@/lib/places';

type Filter = 'all' | 'item' | 'garment' | 'lent';

/**
 * « Contenu du carton » (Figma « Rangement — Carton · Contenu », 135:2740) :
 * recherche dans le carton, puces, et tous ses objets.
 *
 * Écart avec la maquette : les puces sont Tous / Objets / Vêtements /
 * Prêtés (la maquette montre des catégories d'exemple, « Outils »,
 * « Visserie »).
 */
export default function BoxContentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = usePlacesData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const box = data?.boxes.find((b) => b.id === id);

  const contents = useMemo(() => (data && box ? inBox(data, box) : []), [data, box]);
  const shown = useMemo(() => {
    const q = normalize(query);

    return contents.filter((p) => {
      if (filter === 'lent' && p.availability !== 'LENT') return false;
      if ((filter === 'item' || filter === 'garment') && p.kind !== filter) return false;

      return q === '' || [p.name, p.description ?? ''].some((t) => normalize(t).includes(q));
    });
  }, [contents, query, filter]);

  if (!data || !box) {
    return (
      <FlowScreen>
        <View className="h-11 flex-row items-center px-5">
          <BackButton />
        </View>
        {data ? <Missing text="Ce carton n'existe plus." /> : <Loading error={error} />}
      </FlowScreen>
    );
  }

  const chips: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Tous' },
    ...(contents.some((p) => p.kind === 'item') && contents.some((p) => p.kind === 'garment')
      ? [
          { value: 'item' as const, label: 'Objets' },
          { value: 'garment' as const, label: 'Vêtements' },
        ]
      : []),
    ...(contents.some((p) => p.availability === 'LENT') ? [{ value: 'lent' as const, label: 'Prêtés' }] : []),
  ];

  return (
    <FlowScreen>
      <View className="h-11 flex-row items-center px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title="Contenu du carton" legend={`${box.name} · ${objects(contents.length)}`} />
      </View>

      <SearchField value={query} onChange={setQuery} placeholder="Rechercher dans ce carton..." />
      {chips.length > 1 && <FilterChips options={chips} value={filter} onChange={setFilter} />}

      {shown.length === 0 ? (
        <EmptyState
          icon="search"
          title="Aucun objet trouvé"
          text="Rien dans ce carton ne correspond à ta recherche."
          action={{
            label: 'Tout afficher',
            onPress: () => {
              setQuery('');
              setFilter('all');
            },
          }}
        />
      ) : (
        <View className="gap-3">
          {shown.map((p) => (
            <PossessionRow key={p['@id']} possession={p} />
          ))}
        </View>
      )}
    </FlowScreen>
  );
}
