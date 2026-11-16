import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState } from '@/components/inventory/EmptyState';
import { FilterChips, SearchField } from '@/components/inventory/ListControls';
import { Loading, RowCard } from '@/components/places/Blocks';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import i18n from '@/i18n';
import { normalize } from '@/lib/possessions';
import { boxPath, inBox, usePlacesData } from '@/lib/places';

const ALL = '*';

/**
 * « Tous mes cartons » (Figma « Rangement — Tous mes cartons », 135:2831) :
 * recherche (nom, étiquette, pièce, et ce qu'il contient), puces des pièces
 * qui ont des cartons, liste. Le paramètre room préselectionne une pièce
 * (« Voir tout » d'une pièce).
 */
export default function AllBoxesScreen() {
  const { t } = useTranslation('places');
  const params = useLocalSearchParams<{ room?: string }>();
  const { data, error } = usePlacesData();
  const [query, setQuery] = useState('');
  const [roomId, setRoomId] = useState<string>(params.room ?? ALL);

  const chips = useMemo(() => {
    if (!data) return [];
    const used = data.rooms.filter((r) => data.boxes.some((b) => b.room === r.iri));

    return [{ value: ALL, label: t('allBoxes.all') }, ...used.map((r) => ({ value: r.id, label: r.name }))];
  }, [data, t]);

  const shown = useMemo(() => {
    if (!data) return [];
    const q = normalize(query);

    return data.boxes
      .filter((box) => {
        const room = data.rooms.find((r) => r.iri === box.room);
        if (roomId !== ALL && room?.id !== roomId) return false;
        if (q === '') return true;
        const texts = [box.name, box.reference ?? '', boxPath(data, box), ...inBox(data, box).map((p) => p.name)];

        return texts.some((t) => normalize(t).includes(q));
      })
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language, { numeric: true }));
  }, [data, query, roomId]);

  if (!data) {
    return (
      <PlaceScreen title={t('allBoxes.title')}>
        <Loading error={error} />
      </PlaceScreen>
    );
  }

  const inside = data.possessions.filter((p) => p.box).length;

  return (
    <PlaceScreen title={t('allBoxes.title')} legend={[t('counts.boxes', { count: data.boxes.length }), t('counts.objects', { count: inside })].join(' · ')}>
      <SearchField value={query} onChange={setQuery} placeholder={t('allBoxes.search')} />
      {chips.length > 2 && <FilterChips options={chips} value={roomId} onChange={setRoomId} />}

      {shown.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('allBoxes.emptyTitle')}
          text={t('allBoxes.emptyText')}
          action={{
            label: t('allBoxes.emptyAction'),
            onPress: () => {
              setQuery('');
              setRoomId(ALL);
            },
          }}
        />
      ) : (
        <View className="gap-3">
          {shown.map((box) => (
            <RowCard
              key={box.iri}
              title={box.name}
              subtitle={[boxPath(data, box), t('counts.objects', { count: inBox(data, box).length })].filter(Boolean).join(' · ')}
              onPress={() => router.push({ pathname: '/carton/[id]', params: { id: box.id } })}
            />
          ))}
        </View>
      )}
    </PlaceScreen>
  );
}
