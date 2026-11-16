import { type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import i18n from '@/i18n';
import { apiRequest } from '@/lib/api';
import { usePossessions, type Kind, type Possession } from '@/lib/possessions';
import { useLocations, type Box, type Locations, type Place, type Room, type Storage } from '@/lib/reference';

/**
 * Les logements et ce qu'ils contiennent : logement › pièce › rangement ›
 * conteneur (cartons, bacs, tiroirs…). Les emplacements viennent de
 * useLocations, les objets et vêtements de usePossessions ; l'app compte
 * elle-même ce qui est rangé où (l'API n'expose pas de compteurs).
 */

// ---------------------------------------------------------------------------
// Libellés des types (enums de l'API)
// ---------------------------------------------------------------------------

export type PlaceType = 'HOUSE' | 'APARTMENT' | 'STORAGE_UNIT' | 'OTHER';

/**
 * Les six choix de « C'est quoi ? » (Figma 135:2402). L'API n'a que quatre
 * types : Studio est un appartement, Bureau un « autre ». Le choix sert
 * surtout à proposer les bonnes pièces à l'étape suivante.
 */
export type PlaceKind = { key: string; label: string; description: string; type: PlaceType; rooms: string[] };

/** Le nom affiché d'une pièce proposée (l'API l'enregistre ensuite comme donnée). */
const room = (key: string) => i18n.t(`places:roomNames.${key}`);

export function placeKinds(): PlaceKind[] {
  return [
    { key: 'house', label: i18n.t('places:kinds.house.label'), description: i18n.t('places:kinds.house.description'), type: 'HOUSE', rooms: [room('salon'), room('cuisine'), room('office'), room('bedroom'), room('garage'), room('cellar'), room('attic')] },
    { key: 'apartment', label: i18n.t('places:kinds.apartment.label'), description: i18n.t('places:kinds.apartment.description'), type: 'APARTMENT', rooms: [room('salon'), room('cuisine'), room('bedroom'), room('bathroom'), room('cellar')] },
    { key: 'studio', label: i18n.t('places:kinds.studio.label'), description: i18n.t('places:kinds.studio.description'), type: 'APARTMENT', rooms: [room('salon'), room('cuisine'), room('bathroom')] },
    { key: 'storage', label: i18n.t('places:kinds.storage.label'), description: i18n.t('places:kinds.storage.description'), type: 'STORAGE_UNIT', rooms: [room('cellar')] },
    { key: 'office', label: i18n.t('places:kinds.office.label'), description: i18n.t('places:kinds.office.description'), type: 'OTHER', rooms: [room('office')] },
    { key: 'other', label: i18n.t('places:kinds.other.label'), description: i18n.t('places:kinds.other.description'), type: 'OTHER', rooms: [] },
  ];
}

/** Les libellés des types de logement (enums de l'API). */
export function placeTypeLabels(): Record<PlaceType, string> {
  return { HOUSE: i18n.t('places:placeType.house'), APARTMENT: i18n.t('places:placeType.apartment'), STORAGE_UNIT: i18n.t('places:placeType.storageUnit'), OTHER: i18n.t('places:placeType.other') };
}

export type RoomType = 'LIVING_ROOM' | 'BEDROOM' | 'KITCHEN' | 'BATHROOM' | 'OFFICE' | 'ENTRANCE' | 'DRESSING' | 'LAUNDRY' | 'GARAGE' | 'CELLAR' | 'ATTIC' | 'OTHER';

/** Les pièces proposées (Figma « Quelles pièces ? », 135:2480), par groupe, avec leur type d'API. */
export function roomGroups(): { title: string; rooms: { name: string; type: RoomType }[] }[] {
  return [
    {
      title: i18n.t('places:roomGroups.living'),
      rooms: [
        { name: room('salon'), type: 'LIVING_ROOM' },
        { name: room('cuisine'), type: 'KITCHEN' },
        { name: room('diningRoom'), type: 'LIVING_ROOM' },
        { name: room('office'), type: 'OFFICE' },
        { name: room('bathroom'), type: 'BATHROOM' },
        { name: room('entrance'), type: 'ENTRANCE' },
      ],
    },
    {
      title: i18n.t('places:roomGroups.bedrooms'),
      rooms: [
        { name: room('bedroom'), type: 'BEDROOM' },
        { name: room('bedroom2'), type: 'BEDROOM' },
        { name: room('kidsRoom'), type: 'BEDROOM' },
      ],
    },
    {
      title: i18n.t('places:roomGroups.storage'),
      rooms: [
        { name: room('garage'), type: 'GARAGE' },
        { name: room('cellar'), type: 'CELLAR' },
        { name: room('attic'), type: 'ATTIC' },
        { name: room('laundry'), type: 'LAUNDRY' },
        { name: room('dressing'), type: 'DRESSING' },
      ],
    },
  ];
}

export function roomTypes(): { value: RoomType; label: string }[] {
  return [
    { value: 'LIVING_ROOM', label: i18n.t('places:roomTypes.livingRoom') },
    { value: 'BEDROOM', label: i18n.t('places:roomTypes.bedroom') },
    { value: 'KITCHEN', label: i18n.t('places:roomTypes.kitchen') },
    { value: 'BATHROOM', label: i18n.t('places:roomTypes.bathroom') },
    { value: 'OFFICE', label: i18n.t('places:roomTypes.office') },
    { value: 'ENTRANCE', label: i18n.t('places:roomTypes.entrance') },
    { value: 'DRESSING', label: i18n.t('places:roomTypes.dressing') },
    { value: 'LAUNDRY', label: i18n.t('places:roomTypes.laundry') },
    { value: 'GARAGE', label: i18n.t('places:roomTypes.garage') },
    { value: 'CELLAR', label: i18n.t('places:roomTypes.cellar') },
    { value: 'ATTIC', label: i18n.t('places:roomTypes.attic') },
    { value: 'OTHER', label: i18n.t('places:roomTypes.other') },
  ];
}

/** Le type d'une pièce nommée à la main : celui d'une pièce proposée du même nom, sinon « Autre ». */
export function roomTypeOf(name: string): RoomType {
  const key = name.trim().toLowerCase();
  for (const group of roomGroups()) {
    const hit = group.rooms.find((r) => r.name.toLowerCase() === key);
    if (hit) return hit.type;
  }

  return 'OTHER';
}

export type StorageType = 'WARDROBE' | 'CLOSET' | 'SHELF' | 'BOOKCASE' | 'CABINET' | 'DRESSER' | 'DRAWER' | 'RACK' | 'CHEST' | 'OTHER';

export function storageTypes(): { value: StorageType; label: string }[] {
  return [
    { value: 'SHELF', label: i18n.t('places:storageTypes.shelf') },
    { value: 'CLOSET', label: i18n.t('places:storageTypes.closet') },
    { value: 'WARDROBE', label: i18n.t('places:storageTypes.wardrobe') },
    { value: 'RACK', label: i18n.t('places:storageTypes.rack') },
    { value: 'BOOKCASE', label: i18n.t('places:storageTypes.bookcase') },
    { value: 'DRESSER', label: i18n.t('places:storageTypes.dresser') },
    { value: 'CABINET', label: i18n.t('places:storageTypes.cabinet') },
    { value: 'DRAWER', label: i18n.t('places:storageTypes.drawer') },
    { value: 'CHEST', label: i18n.t('places:storageTypes.chest') },
    { value: 'OTHER', label: i18n.t('places:storageTypes.other') },
  ];
}

export type BoxType = 'CARTON' | 'SHELF' | 'DRAWER' | 'BIN' | 'SUITCASE' | 'BAG' | 'OTHER';

export function boxTypes(): { value: BoxType; label: string }[] {
  return [
    { value: 'CARTON', label: i18n.t('places:boxTypes.carton') },
    { value: 'BIN', label: i18n.t('places:boxTypes.bin') },
    { value: 'DRAWER', label: i18n.t('places:boxTypes.drawer') },
    { value: 'SHELF', label: i18n.t('places:boxTypes.shelf') },
    { value: 'SUITCASE', label: i18n.t('places:boxTypes.suitcase') },
    { value: 'BAG', label: i18n.t('places:boxTypes.bag') },
    { value: 'OTHER', label: i18n.t('places:boxTypes.other') },
  ];
}

export const labelOf = <T extends string>(list: { value: T; label: string }[], value: string) => list.find((o) => o.value === value)?.label ?? value;

// ---------------------------------------------------------------------------
// Ce qui est rangé où
// ---------------------------------------------------------------------------

/** Un bien avec sa nature (objet ou vêtement), pour ouvrir la bonne fiche. */
export type Stored = Possession & { kind: Kind };

export type PlacesData = Locations & { possessions: Stored[] };

/**
 * Les emplacements et tous les biens du profil, réunis. pending tant que
 * l'un des trois n'est pas chargé ; error : le premier échec.
 */
export function usePlacesData() {
  const locations = useLocations();
  const items = usePossessions('item');
  const garments = usePossessions('garment');

  const data = useMemo<PlacesData | undefined>(() => {
    if (!locations.data || !items.data || !garments.data) return undefined;
    const possessions: Stored[] = [...items.data.map((p) => ({ ...p, kind: 'item' as const })), ...garments.data.map((p) => ({ ...p, kind: 'garment' as const }))];

    return { ...locations.data, possessions };
  }, [locations.data, items.data, garments.data]);

  const error = locations.error ?? items.error ?? garments.error;

  return { data, error, pending: !data && !error };
}

export const inPlace = (d: PlacesData, place: Place) => {
  const rooms = new Set(d.rooms.filter((r) => r.place === place.iri).map((r) => r.iri));

  return d.possessions.filter((p) => p.room && rooms.has(p.room));
};
export const inRoom = (d: PlacesData, room: Room) => d.possessions.filter((p) => p.room === room.iri);
export const inStorage = (d: PlacesData, storage: Storage) => d.possessions.filter((p) => p.storage === storage.iri);
export const inBox = (d: PlacesData, box: Box) => d.possessions.filter((p) => p.box === box.iri);

/** « Garage › Étagère 2 » : le chemin d'un conteneur à partir de la pièce. */
export function boxPath(d: Locations, box: Box): string {
  const room = d.rooms.find((r) => r.iri === box.room);
  const storage = box.storage ? d.storages.find((s) => s.iri === box.storage) : undefined;

  return [room?.name, storage?.name].filter(Boolean).join(' › ');
}

/** Le logement à afficher pour « principal » (entrée du menu) : le principal, sinon le premier. */
export function findPlace(d: Locations, id: string): Place | undefined {
  if (id === 'principal') return d.places.find((p) => p.primary) ?? d.places[0];

  return d.places.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------------------

type Saved = { '@id': string; id: string; name: string };

/**
 * Crée un logement et ses pièces (« Ajouter ce logement »). Un seul
 * logement principal par profil (index unique en base) : si le nouveau
 * l'est, l'ancien cesse d'abord de l'être.
 */
export async function createPlace(
  queryClient: QueryClient,
  input: { name: string; type: PlaceType; address: string; primary: boolean; rooms: { name: string; type: RoomType }[] },
  current: Place[],
): Promise<{ place: Saved; failedRooms: string[] }> {
  if (input.primary) {
    for (const old of current.filter((p) => p.primary)) {
      await apiRequest(`/api/places/${old.id}`, { method: 'PATCH', body: { primary: false } });
    }
  }
  const place = await apiRequest<Saved>('/api/places', {
    method: 'POST',
    body: { name: input.name, type: input.type, primary: input.primary, ...(input.address ? { address: input.address } : {}) },
  });
  // Les pièces une à une, dans l'ordre choisi (position). Le logement existe
  // déjà : une pièce refusée ne l'annule pas (on la signale, à rajouter).
  const failedRooms: string[] = [];
  for (const [position, room] of input.rooms.entries()) {
    try {
      await apiRequest('/api/rooms', { method: 'POST', body: { name: room.name, type: room.type, position, place: place['@id'] } });
    } catch {
      failedRooms.push(room.name);
    }
  }
  await queryClient.invalidateQueries({ queryKey: ['locations'] });

  return { place, failedRooms };
}

export async function createRoom(queryClient: QueryClient, place: Place, name: string, type: RoomType, position: number): Promise<Saved> {
  const room = await apiRequest<Saved>('/api/rooms', { method: 'POST', body: { name, type, position, place: place.iri } });
  await queryClient.invalidateQueries({ queryKey: ['locations'] });

  return room;
}

export async function createStorage(queryClient: QueryClient, room: Room, name: string, type: StorageType, position: number): Promise<Saved> {
  const storage = await apiRequest<Saved>('/api/storages', { method: 'POST', body: { name, type, position, room: room.iri } });
  await queryClient.invalidateQueries({ queryKey: ['locations'] });

  return storage;
}

export async function createBox(queryClient: QueryClient, input: { name: string; type: BoxType; reference: string; room: string; storage: string | null }): Promise<Saved> {
  const box = await apiRequest<Saved>('/api/boxes', {
    method: 'POST',
    body: { name: input.name, type: input.type, room: input.room, ...(input.storage ? { storage: input.storage } : {}), ...(input.reference ? { reference: input.reference } : {}) },
  });
  await queryClient.invalidateQueries({ queryKey: ['locations'] });

  return box;
}

const LEVEL_PATH = { place: '/api/places', room: '/api/rooms', storage: '/api/storages', box: '/api/boxes' } as const;

/**
 * Supprime un emplacement. L'API refuse s'il contient encore des objets
 * (409, ou contrainte en base) et, en colocation, demande l'accord de tous.
 */
export async function deleteLocation(queryClient: QueryClient, level: keyof typeof LEVEL_PATH, id: string): Promise<void> {
  await apiRequest(`${LEVEL_PATH[level]}/${id}`, { method: 'DELETE' });
  await queryClient.invalidateQueries({ queryKey: ['locations'] });
}
