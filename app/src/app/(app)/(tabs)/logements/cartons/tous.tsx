import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/inventory/EmptyState';
import { FilterChips, SearchField } from '@/components/inventory/ListControls';
import { Loading, RowCard } from '@/components/places/Blocks';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { normalize } from '@/lib/possessions';
import { boxPath, inBox, objects, plural, usePlacesData } from '@/lib/places';

const ALL = '*';

/**
 * « Tous mes cartons » (Figma « Rangement — Tous mes cartons », 135:2831) :
 * recherche (nom, étiquette, pièce, et ce qu'il contient), puces des pièces
 * qui ont des cartons, liste. Le paramètre room préselectionne une pièce
 * (« Voir tout » d'une pièce).
 */
export default function AllBoxesScreen() {
  const params = useLocalSearchParams<{ room?: string }>();
  const { data, error } = usePlacesData();
  const [query, setQuery] = useState('');
  const [roomId, setRoomId] = useState<string>(params.room ?? ALL);

  const chips = useMemo(() => {
    if (!data) return [];
    const used = data.rooms.filter((r) => data.boxes.some((b) => b.room === r.iri));

    return [{ value: ALL, label: 'Tous' }, ...used.map((r) => ({ value: r.id, label: r.name }))];
  }, [data]);

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
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
  }, [data, query, roomId]);

  if (!data) {
    return (
      <PlaceScreen title="Tous mes cartons">
        <Loading error={error} />
      </PlaceScreen>
    );
  }

  const inside = data.possessions.filter((p) => p.box).length;

  return (
    <PlaceScreen title="Tous mes cartons" legend={`${plural(data.boxes.length, 'carton', 'cartons')} · ${objects(inside)}`}>
      <SearchField value={query} onChange={setQuery} placeholder="Rechercher un carton..." />
      {chips.length > 2 && <FilterChips options={chips} value={roomId} onChange={setRoomId} />}

      {shown.length === 0 ? (
        <EmptyState
          icon="search"
          title="Aucun carton trouvé"
          text="Aucun carton ne correspond. Essaie le nom d'un objet qu'il contient."
          action={{
            label: 'Tout afficher',
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
              subtitle={[boxPath(data, box), objects(inBox(data, box).length)].filter(Boolean).join(' · ')}
              onPress={() => router.push({ pathname: '/carton/[id]', params: { id: box.id } })}
            />
          ))}
        </View>
      )}
    </PlaceScreen>
  );
}
