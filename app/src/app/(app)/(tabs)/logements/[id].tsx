import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Breadcrumb, Grid, Loading, Missing, RowCard, TileCard } from '@/components/places/Blocks';
import { DeleteLink } from '@/components/places/DeleteLink';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { deleteLocation, findPlace, inPlace, inRoom, objects, plural, usePlacesData } from '@/lib/places';

/**
 * Vue d'un logement (Figma « Logement — Vue logement », 135:2571) : ses
 * pièces en grille avec leurs rangements et objets, et « Ajouter une
 * pièce ». L'identifiant « principal » ouvre le logement principal (entrée
 * « Logement principal » du menu).
 *
 * Ajout à la maquette : « Supprimer ce logement », en bas, pour un
 * logement vide (l'API refuse s'il contient encore des objets).
 */
export default function PlaceScreenRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = usePlacesData();
  const queryClient = useQueryClient();
  const place = data && findPlace(data, id);

  if (!data) {
    return (
      <PlaceScreen title="Logement">
        <Loading error={error} />
      </PlaceScreen>
    );
  }
  if (!place) {
    return (
      <PlaceScreen title="Logement">
        <Missing text={data.places.length === 0 ? "Tu n'as pas encore de logement." : "Ce logement n'existe plus."} />
        <RowCard title="+ Ajouter un logement" subtitle="Maison, appartement, cave, bureau" onPress={() => router.push('/nouveau-logement/type')} />
      </PlaceScreen>
    );
  }

  const rooms = data.rooms.filter((r) => r.place === place.iri);
  const count = inPlace(data, place).length;

  return (
    <PlaceScreen title={place.name} legend={`${plural(rooms.length, 'pièce', 'pièces')} · ${objects(count)}`}>
      <Breadcrumb crumbs={[{ label: place.name }]} />

      {rooms.length > 0 && (
        <Grid
          items={rooms}
          keyOf={(r) => r.iri}
          render={(room, i) => {
            const storages = data.storages.filter((s) => s.room === room.iri).length;

            return (
              <TileCard
                testID="room-card"
                title={room.name}
                meta={`${plural(storages, 'rangement', 'rangements')} · ${objects(inRoom(data, room).length)}`}
                accent={i === 0}
                onPress={() => router.push({ pathname: '/logements/piece/[id]', params: { id: room.id } })}
              />
            );
          }}
        />
      )}

      <View>
        <RowCard
          title="+ Ajouter une pièce"
          subtitle="Grenier, buanderie, dressing..."
          onPress={() => router.push({ pathname: '/nouvel-emplacement', params: { level: 'room', parent: place.id } })}
        />
      </View>

      {count === 0 && (
        <DeleteLink
          label="Supprimer ce logement"
          what="ce logement"
          name={place.name}
          detail="Ses pièces vides et leurs rangements seront supprimés avec lui."
          onConfirm={async () => {
            await deleteLocation(queryClient, 'place', place.id);
            router.back();
          }}
        />
      )}
    </PlaceScreen>
  );
}
