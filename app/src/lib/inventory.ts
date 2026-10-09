import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

/** Une collection API Platform en JSON-LD (préfixe hydra désactivé : totalItems, member). */
type Collection<T> = { totalItems?: number; 'hydra:totalItems'?: number; member?: T[]; 'hydra:member'?: T[] };

function members<T>(collection: Collection<T>): T[] {
  return collection.member ?? collection['hydra:member'] ?? [];
}

function total(collection: Collection<unknown>): number {
  return collection.totalItems ?? collection['hydra:totalItems'] ?? 0;
}

type Possession = { '@id': string; id: string; name: string; room?: string; photos?: string[] };
type Room = { '@id': string; name: string };

export type RecentEntry = {
  id: string;
  kind: 'item' | 'garment';
  name: string;
  /** Nom de la pièce, si l'emplacement est visible (objet à soi ou partagé avec l'emplacement). */
  room: string | null;
  createdAt: Date;
  /** Photo principale (GET /api/media/{id}), s'il y en a une. */
  photo: string | null;
};

export type InventoryOverview = {
  items: number;
  garments: number;
  recent: RecentEntry[];
};

/**
 * Date de création lue dans l'identifiant : les UUID v7 de l'API commencent
 * par l'horodatage en millisecondes (48 premiers bits). L'API n'expose pas
 * createdAt, et c'est la même valeur, à la milliseconde près.
 */
export function uuidV7Date(id: string): Date {
  return new Date(parseInt(id.replace(/-/g, '').slice(0, 12), 16));
}

/** « Aujourd'hui », « Hier », « Il y a 3 j », comme sur les cartes de la maquette. */
export function relativeDay(date: Date, now = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(date)) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';

  return `Il y a ${days} j`;
}

const RECENT = 10;

/**
 * Ce que l'accueil affiche : les compteurs (objets, vêtements) et les
 * derniers ajouts, objets et vêtements mêlés, du plus récent au plus ancien.
 *
 * Limite assumée : l'API n'a pas encore de tri par date. On lit la première
 * page de chaque liste (30) et on trie ici par identifiant (UUID v7 = ordre
 * de création). Exact tant qu'on a moins de 30 objets et 30 vêtements ; au
 * delà, il faudra un filtre order[createdAt] côté API.
 */
export function useInventoryOverview() {
  return useQuery({
    queryKey: ['inventory', 'overview'],
    queryFn: async ({ signal }): Promise<InventoryOverview> => {
      const [items, garments, rooms] = await Promise.all([
        apiGet<Collection<Possession>>('/api/items', signal),
        apiGet<Collection<Possession>>('/api/garments', signal),
        apiGet<Collection<Room>>('/api/rooms', signal),
      ]);
      const roomName = new Map(members(rooms).map((room) => [room['@id'], room.name]));
      const entries = (list: Possession[], kind: RecentEntry['kind']): RecentEntry[] =>
        list.map((p) => ({ id: p.id, kind, name: p.name, room: p.room ? (roomName.get(p.room) ?? null) : null, createdAt: uuidV7Date(p.id), photo: p.photos?.[0] ?? null }));
      const recent = [...entries(members(items), 'item'), ...entries(members(garments), 'garment')]
        .sort((a, b) => (a.id < b.id ? 1 : -1))
        .slice(0, RECENT);

      return { items: total(items), garments: total(garments), recent };
    },
  });
}
