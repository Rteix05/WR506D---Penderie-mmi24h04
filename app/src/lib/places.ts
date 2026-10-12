import { type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

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

export const PLACE_KINDS: PlaceKind[] = [
  { key: 'house', label: 'Maison', description: 'Plusieurs pièces, un garage, une cave', type: 'HOUSE', rooms: ['Salon', 'Cuisine', 'Bureau', 'Chambre', 'Garage', 'Cave', 'Grenier'] },
  { key: 'apartment', label: 'Appartement', description: 'Quelques pièces, une cave', type: 'APARTMENT', rooms: ['Salon', 'Cuisine', 'Chambre', 'Salle de bain', 'Cave'] },
  { key: 'studio', label: 'Studio', description: 'Une pièce à vivre', type: 'APARTMENT', rooms: ['Salon', 'Cuisine', 'Salle de bain'] },
  { key: 'storage', label: 'Cave ou box', description: 'Un seul espace de stockage', type: 'STORAGE_UNIT', rooms: ['Cave'] },
  { key: 'office', label: 'Bureau', description: 'Ton lieu de travail', type: 'OTHER', rooms: ['Bureau'] },
  { key: 'other', label: 'Autre', description: 'À toi de le nommer', type: 'OTHER', rooms: [] },
];

export const PLACE_TYPE_LABEL: Record<PlaceType, string> = { HOUSE: 'Maison', APARTMENT: 'Appartement', STORAGE_UNIT: 'Cave ou box', OTHER: 'Autre' };

export type RoomType = 'LIVING_ROOM' | 'BEDROOM' | 'KITCHEN' | 'BATHROOM' | 'OFFICE' | 'ENTRANCE' | 'DRESSING' | 'LAUNDRY' | 'GARAGE' | 'CELLAR' | 'ATTIC' | 'OTHER';

/** Les pièces proposées (Figma « Quelles pièces ? », 135:2480), par groupe, avec leur type d'API. */
export const ROOM_GROUPS: { title: string; rooms: { name: string; type: RoomType }[] }[] = [
  {
    title: 'Pièces à vivre',
    rooms: [
      { name: 'Salon', type: 'LIVING_ROOM' },
      { name: 'Cuisine', type: 'KITCHEN' },
      { name: 'Salle à manger', type: 'LIVING_ROOM' },
      { name: 'Bureau', type: 'OFFICE' },
      { name: 'Salle de bain', type: 'BATHROOM' },
      { name: 'Entrée', type: 'ENTRANCE' },
    ],
  },
  {
    title: 'Chambres',
    rooms: [
      { name: 'Chambre', type: 'BEDROOM' },
      { name: 'Chambre 2', type: 'BEDROOM' },
      { name: 'Chambre enfant', type: 'BEDROOM' },
    ],
  },
  {
    title: 'Rangement',
    rooms: [
      { name: 'Garage', type: 'GARAGE' },
      { name: 'Cave', type: 'CELLAR' },
      { name: 'Grenier', type: 'ATTIC' },
      { name: 'Buanderie', type: 'LAUNDRY' },
      { name: 'Dressing', type: 'DRESSING' },
    ],
  },
];

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'LIVING_ROOM', label: 'Pièce à vivre' },
  { value: 'BEDROOM', label: 'Chambre' },
  { value: 'KITCHEN', label: 'Cuisine' },
  { value: 'BATHROOM', label: 'Salle de bain' },
  { value: 'OFFICE', label: 'Bureau' },
  { value: 'ENTRANCE', label: 'Entrée' },
  { value: 'DRESSING', label: 'Dressing' },
  { value: 'LAUNDRY', label: 'Buanderie' },
  { value: 'GARAGE', label: 'Garage' },
  { value: 'CELLAR', label: 'Cave' },
  { value: 'ATTIC', label: 'Grenier' },
  { value: 'OTHER', label: 'Autre' },
];

/** Le type d'une pièce nommée à la main : celui d'une pièce proposée du même nom, sinon « Autre ». */
export function roomTypeOf(name: string): RoomType {
  const key = name.trim().toLowerCase();
  for (const group of ROOM_GROUPS) {
    const hit = group.rooms.find((r) => r.name.toLowerCase() === key);
    if (hit) return hit.type;
  }

  return 'OTHER';
}

export type StorageType = 'WARDROBE' | 'CLOSET' | 'SHELF' | 'BOOKCASE' | 'CABINET' | 'DRESSER' | 'DRAWER' | 'RACK' | 'CHEST' | 'OTHER';

export const STORAGE_TYPES: { value: StorageType; label: string }[] = [
  { value: 'SHELF', label: 'Étagère' },
  { value: 'CLOSET', label: 'Placard' },
  { value: 'WARDROBE', label: 'Armoire' },
  { value: 'RACK', label: 'Penderie' },
  { value: 'BOOKCASE', label: 'Bibliothèque' },
  { value: 'DRESSER', label: 'Commode' },
  { value: 'CABINET', label: 'Meuble' },
  { value: 'DRAWER', label: 'Tiroir' },
  { value: 'CHEST', label: 'Coffre' },
  { value: 'OTHER', label: 'Autre' },
];

export type BoxType = 'CARTON' | 'SHELF' | 'DRAWER' | 'BIN' | 'SUITCASE' | 'BAG' | 'OTHER';

export const BOX_TYPES: { value: BoxType; label: string }[] = [
  { value: 'CARTON', label: 'Carton' },
  { value: 'BIN', label: 'Bac' },
  { value: 'DRAWER', label: 'Tiroir' },
  { value: 'SHELF', label: 'Étagère' },
  { value: 'SUITCASE', label: 'Valise' },
  { value: 'BAG', label: 'Sac' },
  { value: 'OTHER', label: 'Autre' },
];

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

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
export const objects = (n: number) => plural(n, 'objet', 'objets');

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
