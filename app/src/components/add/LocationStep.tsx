import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SelectField } from '@/components/form/SelectField';
import { E1 } from '@/components/ui/elevation';
import { PathCard } from '@/components/ui/InfoCard';
import { locationPath, type Draft, type Location } from '@/lib/add-draft';
import { apiGetAll, createLocation, useLocations, type Locations, type Ref } from '@/lib/reference';

type Props = {
  kind: Draft['kind'];
  location: Location;
  onChange: (location: Location) => void;
};

const find = (list: Ref[], iri: string | null | undefined): Ref | null => (iri ? (list.find((r) => r.iri === iri) ?? null) : null);

/**
 * « Où tu le ranges ? » (Figma « Objet — Localisation » 135:2035 et
 * « Vêtement — Ajout · Localisation » 135:3064) : l'emplacement choisi en
 * tête, puis Logement › Pièce › Rangement › Conteneur en cascade (changer
 * un niveau vide ceux du dessous), et les emplacements récents.
 *
 * Chaque liste permet de créer la valeur manquante (« Nouvelle pièce… ») :
 * sans logement ni pièce, on ne pourrait rien ranger, et le parcours
 * complet de création de logement n'existe pas encore dans l'app.
 */
export function LocationStep({ kind, location, onChange }: Props) {
  const locations = useLocations();
  const queryClient = useQueryClient();
  const data = locations.data;

  // Un seul logement (ou un principal) : il est choisi d'office.
  useEffect(() => {
    if (!data || location.place) return;
    const place = data.places.find((p) => p.primary) ?? (data.places.length === 1 ? data.places[0] : undefined);
    if (place) onChange({ ...location, place: { iri: place.iri, name: place.name } });
  }, [data, location, onChange]);

  const rooms = data?.rooms.filter((r) => r.place === location.place?.iri) ?? [];
  const storages = data?.storages.filter((s) => s.room === location.room?.iri) ?? [];
  const boxes = data?.boxes.filter((b) => b.room === location.room?.iri && (b.storage === null || b.storage === location.storage?.iri)) ?? [];

  const created = async (level: 'place' | 'room' | 'storage' | 'box', name: string) => {
    const ref = await createLocation(level, name, { place: location.place?.iri, room: location.room?.iri, storage: location.storage?.iri ?? null });
    await queryClient.invalidateQueries({ queryKey: ['locations'] });

    return ref;
  };

  const boxLabel = kind === 'garment' ? 'Étagère' : 'Conteneur';
  const path = locationPath(location);

  return (
    <View className="gap-6">
      <PathCard title="Emplacement choisi" path={path || 'Choisis au moins un logement et une pièce'} />

      <View className="gap-5 px-5">
        <SelectField
          label="Logement"
          value={location.place?.name ?? null}
          loading={locations.isPending}
          options={(data?.places ?? []).map((p) => ({ key: p.iri, label: p.name }))}
          onSelect={(iri) => onChange({ place: find(data?.places ?? [], iri), room: null, storage: null, box: null })}
          onCreate={async (name) => onChange({ place: await created('place', name), room: null, storage: null, box: null })}
          createLabel="Nouveau logement"
        />
        <SelectField
          label="Pièce"
          value={location.room?.name ?? null}
          disabled={!location.place}
          options={rooms.map((r) => ({ key: r.iri, label: r.name }))}
          onSelect={(iri) => onChange({ ...location, room: find(rooms, iri), storage: null, box: null })}
          onCreate={async (name) => onChange({ ...location, room: await created('room', name), storage: null, box: null })}
          createLabel="Nouvelle pièce"
        />
        <SelectField
          label="Rangement"
          placeholder="Facultatif"
          value={location.storage?.name ?? null}
          disabled={!location.room}
          clearable
          options={storages.map((s) => ({ key: s.iri, label: s.name }))}
          onSelect={(iri) => onChange({ ...location, storage: find(storages, iri), box: null })}
          onCreate={async (name) => onChange({ ...location, storage: await created('storage', name), box: null })}
          createLabel="Nouveau rangement"
        />
        <SelectField
          label={boxLabel}
          placeholder="Facultatif"
          value={location.box?.name ?? null}
          disabled={!location.room}
          clearable
          options={boxes.map((b) => ({ key: b.iri, label: b.name }))}
          onSelect={(iri) => onChange({ ...location, box: find(boxes, iri) })}
          onCreate={async (name) => onChange({ ...location, box: await created('box', name) })}
          createLabel={kind === 'garment' ? 'Nouvelle étagère' : 'Nouveau conteneur'}
        />
      </View>

      {data && <RecentPlaces kind={kind} locations={data} onPick={onChange} />}
    </View>
  );
}

type Possession = { room?: string; storage?: string | null; box?: string | null };

/**
 * « Emplacements récents » : les deux endroits où le profil range le plus
 * d'objets (ou de vêtements), avec leur nombre. Toucher en remplit tous
 * les niveaux d'un coup.
 */
function RecentPlaces({ kind, locations, onPick }: { kind: Draft['kind']; locations: Locations; onPick: (l: Location) => void }) {
  const possessions = useQuery({
    queryKey: ['inventory', 'locations', kind],
    queryFn: ({ signal }) => apiGetAll<Possession>(kind === 'item' ? '/api/items' : '/api/garments', signal),
  });

  const recents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of possessions.data ?? []) {
      if (!p.room) continue;
      const key = [p.room, p.storage ?? '', p.box ?? ''].join('|');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key, count]) => {
        const [roomIri, storageIri, boxIri] = key.split('|');
        const room = locations.rooms.find((r) => r.iri === roomIri);
        const place = room ? locations.places.find((p) => p.iri === room.place) : undefined;
        if (!room || !place) return null;
        const location: Location = {
          place: { iri: place.iri, name: place.name },
          room: { iri: room.iri, name: room.name },
          storage: find(locations.storages, storageIri),
          box: find(locations.boxes, boxIri),
        };

        return { location, count };
      })
      .filter((r): r is { location: Location; count: number } => r !== null);
  }, [possessions.data, locations]);

  if (recents.length === 0) return null;
  const unit = kind === 'item' ? ['objet rangé ici', 'objets rangés ici'] : ['vêtement rangé ici', 'vêtements rangés ici'];

  return (
    <View className="gap-3 px-5">
      <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
        Emplacements récents
      </Text>
      {recents.map(({ location, count }) => {
        // Comme la maquette : à partir de la pièce (« Garage › Étagère 2 »).
        const label = locationPath({ ...location, place: null });
        const meta = `${count} ${count > 1 ? unit[1] : unit[0]}`;

        return (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${meta}`}
            onPress={() => onPick(location)}
            style={E1}
            className="flex-row items-center justify-between rounded-md bg-surface px-4 py-3 active:opacity-80 dark:bg-surface-night">
            <View className="flex-1 gap-0.5">
              <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{label}</Text>
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">{meta}</Text>
            </View>
            <Text className="font-luciole-bold text-body text-muted/[0.85] dark:text-muted-night">›</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
