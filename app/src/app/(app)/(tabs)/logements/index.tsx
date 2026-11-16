import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState } from '@/components/inventory/EmptyState';
import { Grid, Loading, RowCard, TileCard } from '@/components/places/Blocks';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { inPlace, usePlacesData } from '@/lib/places';

/**
 * « Mes logements » (Figma « Logement — Mes logements », 135:2549) : les
 * logements en grille (le principal d'abord), puis « Ajouter un logement ».
 *
 * Écart avec la maquette : pas de bloc « Sans logement ». Pour l'API, tout
 * objet a une pièce (obligatoire à l'ajout) : il n'y a jamais d'objet
 * « à ranger » hors logement.
 */
export default function PlacesScreen() {
  const { t } = useTranslation('places');
  const { data, error } = usePlacesData();
  const addPlace = () => router.push('/nouveau-logement/type');

  if (!data) {
    return (
      <PlaceScreen title={t('list.title')}>
        <Loading error={error} />
      </PlaceScreen>
    );
  }

  const stored = data.possessions.filter((p) => p.room).length;
  const legend = [t('counts.places', { count: data.places.length }), t('counts.storedObjects', { count: stored })].join(' · ');

  return (
    <PlaceScreen title={t('list.title')} legend={legend}>
      {data.places.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('list.emptyTitle')}
          text={t('list.emptyText')}
          action={{ label: t('list.emptyAction'), glyph: '+', onPress: addPlace }}
        />
      ) : (
        <>
          <Grid
            items={data.places}
            keyOf={(p) => p.iri}
            render={(place, i) => {
              const rooms = data.rooms.filter((r) => r.place === place.iri).length;

              return (
                <TileCard
                  title={place.name}
                  meta={[t('counts.rooms', { count: rooms }), t('counts.objects', { count: inPlace(data, place).length })].join(' · ')}
                  accent={i === 0}
                  onPress={() => router.push({ pathname: '/logements/[id]', params: { id: place.id } })}
                />
              );
            }}
          />
          <View>
            <RowCard title={t('addPlaceCard.title')} subtitle={t('addPlaceCard.hint')} onPress={addPlace} />
          </View>
        </>
      )}
    </PlaceScreen>
  );
}
