import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Breadcrumb, Grid, Loading, Missing, RowCard, TileCard } from '@/components/places/Blocks';
import { DeleteLink } from '@/components/places/DeleteLink';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { deleteLocation, findPlace, inPlace, inRoom, usePlacesData } from '@/lib/places';

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
  const { t } = useTranslation('places');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = usePlacesData();
  const queryClient = useQueryClient();
  const place = data && findPlace(data, id);

  if (!data) {
    return (
      <PlaceScreen title={t('detail.title')}>
        <Loading error={error} />
      </PlaceScreen>
    );
  }
  if (!place) {
    return (
      <PlaceScreen title={t('detail.title')}>
        <Missing text={data.places.length === 0 ? t('detail.noPlace') : t('detail.gone')} />
        <RowCard title={t('addPlaceCard.title')} subtitle={t('addPlaceCard.hint')} onPress={() => router.push('/nouveau-logement/type')} />
      </PlaceScreen>
    );
  }

  const rooms = data.rooms.filter((r) => r.place === place.iri);
  const count = inPlace(data, place).length;

  return (
    <PlaceScreen title={place.name} legend={[t('counts.rooms', { count: rooms.length }), t('counts.objects', { count })].join(' · ')}>
      <Breadcrumb crumbs={[{ label: place.name }]} />

      {rooms.length > 0 && (
        <Grid
          items={rooms}
          keyOf={(r) => r.iri}
          render={(room, i) => {
            const storages = data.storages.filter((s) => s.room === room.iri).length;

            return (
              <TileCard
                title={room.name}
                meta={[t('counts.storages', { count: storages }), t('counts.objects', { count: inRoom(data, room).length })].join(' · ')}
                accent={i === 0}
                onPress={() => router.push({ pathname: '/logements/piece/[id]', params: { id: room.id } })}
              />
            );
          }}
        />
      )}

      <View>
        <RowCard
          title={t('detail.addRoom')}
          subtitle={t('detail.addRoomHint')}
          onPress={() => router.push({ pathname: '/nouvel-emplacement', params: { level: 'room', parent: place.id } })}
        />
      </View>

      {count === 0 && (
        <DeleteLink
          label={t('detail.delete')}
          what={t('detail.deleteWhat')}
          name={place.name}
          detail={t('detail.deleteDetail')}
          onConfirm={async () => {
            await deleteLocation(queryClient, 'place', place.id);
            router.back();
          }}
        />
      )}
    </PlaceScreen>
  );
}
