import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { FlowScreen } from '@/components/add/FlowScreen';
import { EmptyState } from '@/components/inventory/EmptyState';
import { FilterChips, SearchField } from '@/components/inventory/ListControls';
import { Loading, Missing, PossessionRow } from '@/components/places/Blocks';
import { BackButton } from '@/components/ui/BackButton';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { normalize } from '@/lib/possessions';
import { inBox, usePlacesData } from '@/lib/places';

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
  const { t } = useTranslation('places');
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
        {data ? <Missing text={t('boxContents.gone')} /> : <Loading error={error} />}
      </FlowScreen>
    );
  }

  const chips: { value: Filter; label: string }[] = [
    { value: 'all', label: t('boxContents.all') },
    ...(contents.some((p) => p.kind === 'item') && contents.some((p) => p.kind === 'garment')
      ? [
          { value: 'item' as const, label: t('boxContents.items') },
          { value: 'garment' as const, label: t('boxContents.garments') },
        ]
      : []),
    ...(contents.some((p) => p.availability === 'LENT') ? [{ value: 'lent' as const, label: t('boxContents.lent') }] : []),
  ];

  return (
    <FlowScreen>
      <View className="h-11 flex-row items-center px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title={t('boxContents.title')} legend={`${box.name} · ${t('counts.objects', { count: contents.length })}`} />
      </View>

      <SearchField value={query} onChange={setQuery} placeholder={t('boxContents.search')} />
      {chips.length > 1 && <FilterChips options={chips} value={filter} onChange={setFilter} />}

      {shown.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('boxContents.emptyTitle')}
          text={t('boxContents.emptyText')}
          action={{
            label: t('boxContents.emptyAction'),
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
