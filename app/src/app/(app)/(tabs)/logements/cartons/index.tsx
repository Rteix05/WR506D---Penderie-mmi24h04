import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState } from '@/components/inventory/EmptyState';
import { BoxGlyph, Grid, Loading, RowCard, SectionHeader, TileCard } from '@/components/places/Blocks';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { boxPath, inBox, usePlacesData } from '@/lib/places';

/** Cartons montrés en grille avant « Voir tout ». */
const RECENT = 4;

/**
 * « Mes cartons » (Figma « Rangement — Mes cartons », 135:2783) : les
 * quatre derniers cartons en grille, « Voir tout », « Créer un carton ».
 *
 * Écart avec la maquette : « Récemment ajoutés » plutôt que « Récemment
 * ouverts » : l'API ne retient pas quand un carton est ouvert. Les UUID v7
 * donnent l'ordre de création.
 */
export default function BoxesScreen() {
  const { t } = useTranslation('places');
  const { data, error } = usePlacesData();
  const create = () => router.push('/nouveau-carton/infos');

  if (!data) {
    return (
      <PlaceScreen title={t('boxes.title')}>
        <Loading error={error} />
      </PlaceScreen>
    );
  }

  const inside = data.possessions.filter((p) => p.box).length;
  const recent = [...data.boxes].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, RECENT);

  return (
    <PlaceScreen title={t('boxes.title')} legend={[t('counts.boxes', { count: data.boxes.length }), t('counts.objects', { count: inside })].join(' · ')}>
      {data.boxes.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('boxes.emptyTitle')}
          text={t('boxes.emptyText')}
          action={{ label: t('boxes.emptyAction'), glyph: '+', onPress: create }}
        />
      ) : (
        <>
          <View className="gap-3">
            <SectionHeader
              title={t('boxes.recent')}
              aside={data.boxes.length > RECENT ? t('boxes.seeAll') : undefined}
              onAside={() => router.push('/logements/cartons/tous')}
            />
            <Grid
              items={recent}
              keyOf={(b) => b.iri}
              render={(box) => (
                <TileCard
                  title={box.name}
                  meta={boxPath(data, box)}
                  aside={t('counts.objects', { count: inBox(data, box).length })}
                  accent
                  glyph={<BoxGlyph />}
                  onPress={() => router.push({ pathname: '/carton/[id]', params: { id: box.id } })}
                />
              )}
            />
          </View>
          <View className="gap-3">
            {data.boxes.length <= RECENT && data.boxes.length > 1 && <RowCard title={t('boxes.all')} subtitle={t('boxes.allHint')} onPress={() => router.push('/logements/cartons/tous')} />}
            <RowCard title={t('boxes.create')} subtitle={t('boxes.createHint')} onPress={create} />
          </View>
        </>
      )}
    </PlaceScreen>
  );
}
