import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { ImagePickerAsset } from 'expo-image-picker';

import { apiGet, apiRequest, apiUpload } from '@/lib/api';
import { fileFormData, preparePhoto, type ScanSuggestion } from '@/lib/scan';

/**
 * Le look du jour (API /api/looks) : une photo de soi, et un point par
 * vêtement porté, qui désigne un vêtement du dressing. Pas d'IA : on
 * choisit soi-même ; un vêtement absent du dressing s'ajoute d'un simple
 * titre, « à compléter » plus tard. Le look prépare un post Instagram en
 * deux images (la photo avec ses points, puis les vêtements) ; l'app ne
 * publie rien elle-même, elle tient l'état du look.
 */
export type LookStatus = 'TAGGING' | 'READY' | 'POSTED';
/** MATCHED, NEW, UNKNOWN : seulement sur les points des anciens looks (quand l'IA les analysait). */
export type LookTagStatus = 'MATCHED' | 'NEW' | 'UNKNOWN' | 'CONFIRMED';

export type LookGarment = {
  '@id': string;
  id: string;
  name: string;
  /** Nulle pour un vêtement à compléter. */
  category: string | null;
  brand: string | null;
  photo: string | null;
  /** Créé d'un titre depuis le look : ni catégorie ni pièce, à terminer. */
  incomplete: boolean;
};

export type LookTag = {
  id: string;
  /** Position sur la photo, de 0 à 1 depuis le coin haut gauche. */
  x: number;
  y: number;
  position: number;
  status: LookTagStatus;
  garment: LookGarment | null;
  /** Anciens looks seulement : ce que l'IA avait vu. */
  suggestion: ScanSuggestion | null;
  model: string | null;
};

export type Look = {
  id: string;
  '@id': string;
  wornOn: string;
  status: LookStatus;
  caption: string | null;
  postedAt: string | null;
  photo: { url: string; width: number | null; height: number | null };
  tags: LookTag[];
  /** Sa publication dans le fil de Penderie, si elle est en ligne. */
  post: { id: string; audience: 'FRIENDS' | 'FOLLOWERS' | 'SPECIFIC' } | null;
};

export const MAX_TAGS = 12;

export const LOOK_STATUS: Record<LookStatus, string> = {
  TAGGING: 'En préparation',
  READY: 'Prêt à poster',
  POSTED: 'Posté',
};

/** Le nom à afficher pour un point : son vêtement. */
export function tagName(tag: LookTag): string {
  return tag.garment?.name ?? tag.suggestion?.name ?? `Vêtement ${tag.position + 1}`;
}

export const isReady = (look: Look) => look.tags.length > 0 && look.tags.every((t) => t.status === 'CONFIRMED');

export function useTodayLook() {
  return useQuery({ queryKey: ['look', 'today'], queryFn: async ({ signal }) => (await apiGet<{ look: Look | null }>('/api/looks/today', signal)).look });
}

export function useLook(id: string) {
  return useQuery({ queryKey: ['look', id], queryFn: ({ signal }) => apiGet<Look>(`/api/looks/${id}`, signal) });
}

/** Le look tel que l'API vient de le renvoyer : la fiche et l'accueil se mettent à jour. */
function store(queryClient: QueryClient, look: Look): Look {
  queryClient.setQueryData(['look', look.id], look);
  queryClient.setQueryData(['look', 'today'], look);

  return look;
}

function patchTag(queryClient: QueryClient, lookId: string, tag: LookTag, remove = false) {
  queryClient.setQueryData<Look>(['look', lookId], (look) => {
    if (!look) return look;
    const others = look.tags.filter((t) => t.id !== tag.id);
    const tags = remove ? others : [...others, tag].sort((a, b) => a.position - b.position);
    const next = { ...look, tags };
    queryClient.setQueryData(['look', 'today'], next);

    return next;
  });
}

// ---------------------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------------------

/** Crée le look du jour avec la photo prise (réduite, en JPEG). */
export async function createLook(queryClient: QueryClient, asset: ImagePickerAsset): Promise<Look> {
  const file = await preparePhoto(asset);
  const look = await apiUpload<Look>('/api/looks', await fileFormData(file));

  return store(queryClient, look);
}

/**
 * Pose un point sur un vêtement : un vêtement du dressing (son IRI), ou un
 * titre pour un vêtement qui n'y est pas encore. Celui-ci est créé « à
 * compléter » : le dressing change aussi.
 */
export async function addTag(queryClient: QueryClient, lookId: string, x: number, y: number, target: { garment: string } | { name: string }): Promise<LookTag> {
  const tag = await apiRequest<LookTag>(`/api/looks/${lookId}/tags`, {
    method: 'POST',
    body: { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), ...target },
    accept: 'application/json',
  });
  patchTag(queryClient, lookId, tag);
  if ('name' in target) await queryClient.invalidateQueries({ queryKey: ['inventory'] });

  return tag;
}

/** Change le vêtement d'un point. */
export async function confirmTag(queryClient: QueryClient, lookId: string, tagId: string, garmentIri: string): Promise<LookTag> {
  const tag = await apiRequest<LookTag>(`/api/looks/${lookId}/tags/${tagId}`, { method: 'PATCH', body: { garment: garmentIri }, accept: 'application/json' });
  patchTag(queryClient, lookId, tag);

  return tag;
}

export async function removeTag(queryClient: QueryClient, lookId: string, tag: LookTag): Promise<void> {
  await apiRequest(`/api/looks/${lookId}/tags/${tag.id}`, { method: 'DELETE' });
  patchTag(queryClient, lookId, tag, true);
}

/** Change l'état (TAGGING › READY › POSTED) ou la légende. */
export async function updateLook(queryClient: QueryClient, lookId: string, patch: { status?: LookStatus; caption?: string | null }): Promise<Look> {
  const look = await apiRequest<Look>(`/api/looks/${lookId}`, { method: 'PATCH', body: patch, accept: 'application/json' });
  if (patch.status === 'READY') {
    // Le look prêt note le port de chaque vêtement : les fiches changent.
    await queryClient.invalidateQueries({ queryKey: ['inventory'] });
  }

  return store(queryClient, look);
}

export async function deleteLook(queryClient: QueryClient, lookId: string): Promise<void> {
  await apiRequest(`/api/looks/${lookId}`, { method: 'DELETE' });
  queryClient.removeQueries({ queryKey: ['look', lookId] });
  queryClient.setQueryData(['look', 'today'], null);
}
