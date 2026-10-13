import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { apiGet, apiRequest, apiUpload, mediaSource } from '@/lib/api';
import { fileFormData, preparePhoto, type ScanSuggestion } from '@/lib/scan';

/**
 * Le look du jour (API /api/looks) : une photo de soi, un point par
 * vêtement porté, et l'IA qui reconnaît chaque vêtement, dans le dressing
 * ou comme un vêtement nouveau. Il prépare un post Instagram en deux
 * images (la photo avec ses points, puis les vêtements) ; l'app ne publie
 * rien elle-même, elle tient l'état du look.
 */
export type LookStatus = 'TAGGING' | 'READY' | 'POSTED';
export type LookTagStatus = 'MATCHED' | 'NEW' | 'UNKNOWN' | 'CONFIRMED';

export type LookGarment = { '@id': string; id: string; name: string; category: string; brand: string | null; photo: string | null };

export type LookTag = {
  id: string;
  /** Position sur la photo, de 0 à 1 depuis le coin haut gauche. */
  x: number;
  y: number;
  position: number;
  status: LookTagStatus;
  garment: LookGarment | null;
  /** Ce que l'IA a vu, au format du scan : pré-remplit l'ajout d'un vêtement nouveau. */
  suggestion: ScanSuggestion | null;
  model: string | null;
  /** Le contour du vêtement délimité par l'IA, sur la photo (de 0 à 1). */
  box: LookBox | null;
  /** L'IA a décrit un autre vêtement que celui du point : sa réponse a été écartée. */
  offTarget: boolean;
};

/** Un rectangle sur la photo : coin haut gauche (x0, y0), coin bas droit (x1, y1), de 0 à 1. */
export type LookBox = { x0: number; y0: number; x1: number; y1: number };

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

/** Ce que l'IA a dit d'un point, en une ligne. */
export function tagLine(tag: LookTag): string {
  switch (tag.status) {
    case 'CONFIRMED':
      return 'Confirmé';
    case 'MATCHED':
      return 'Reconnu dans ton dressing : confirme';
    case 'NEW':
      return 'Pas dans ton dressing : ajoute-le';
    default:
      return tag.offTarget ? "L'IA a regardé à côté du point : choisis le vêtement" : 'Pas reconnu : choisis le vêtement';
  }
}

/** Le nom à afficher pour un point : le vêtement désigné, sinon ce que l'IA a vu. */
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
// La photo d'origine, gardée sur le téléphone pour découper les gros plans
// ---------------------------------------------------------------------------

/** La photo envoyée, par look : pas besoin de la retélécharger pour découper. */
const localPhotos = new Map<string, string>();

/** Les gros plans envoyés à l'IA, par point : ils servent de photo au vêtement ajouté. */
const crops = new Map<string, { uri: string; width: number; height: number }>();

export function cropOf(tagId: string): ImagePickerAsset | null {
  const crop = crops.get(tagId);

  return crop ? { ...crop, mimeType: 'image/jpeg', type: 'image' } : null;
}

/** La photo du look sur le téléphone : celle qu'on vient d'envoyer, sinon téléchargée (avec le jeton). */
async function localPhoto(look: Look): Promise<string> {
  const known = localPhotos.get(look.id);
  if (known) return known;
  const source = mediaSource(look.photo.url);
  let uri: string;
  if (Platform.OS === 'web') {
    const response = await fetch(source.uri, { headers: source.headers });
    uri = URL.createObjectURL(await response.blob());
  } else {
    const file = await File.downloadFileAsync(source.uri, new File(new Directory(Paths.cache), `look-${look.id}.jpg`), { headers: source.headers, idempotent: true });
    uri = file.uri;
  }
  localPhotos.set(look.id, uri);

  return uri;
}

/** Côté du gros plan, en part de la largeur de la photo : un haut entier tient dedans, une chaussure reste lisible. */
const CROP_SIDE = 0.45;

/**
 * Découpe un carré centré sur le point (décalé s'il déborde de la photo),
 * réduit à 640 px : c'est ce que l'IA regarde.
 */
async function cropAround(uri: string, size: { width: number; height: number }, x: number, y: number) {
  const side = Math.round(Math.min(size.width * CROP_SIDE, size.height));
  const originX = Math.round(Math.min(Math.max(x * size.width - side / 2, 0), size.width - side));
  const originY = Math.round(Math.min(Math.max(y * size.height - side / 2, 0), size.height - side));
  const context = ImageManipulator.manipulate(uri).crop({ originX, originY, width: side, height: side });
  if (side > 640) context.resize({ width: 640 });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  // Où le gros plan a été découpé, en part de la photo : l'API en déduit où tombe le point dessus.
  const area = { x: originX / size.width, y: originY / size.height, w: side / size.width, h: side / size.height };

  return { image: { uri: saved.uri, width: saved.width, height: saved.height }, area };
}

// ---------------------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------------------

/** Crée le look du jour avec la photo prise (réduite, en JPEG). */
export async function createLook(queryClient: QueryClient, asset: ImagePickerAsset): Promise<Look> {
  const file = await preparePhoto(asset);
  const look = await apiUpload<Look>('/api/looks', await fileFormData(file));
  localPhotos.set(look.id, file.uri);

  return store(queryClient, look);
}

/**
 * Pose un point : découpe le gros plan autour, l'envoie avec la position,
 * et l'IA répond dans la foulée (quelques secondes, parfois 30 avec les
 * modèles gratuits).
 */
export async function addTag(queryClient: QueryClient, look: Look, x: number, y: number): Promise<LookTag> {
  const uri = await localPhoto(look);
  const size = look.photo.width && look.photo.height ? { width: look.photo.width, height: look.photo.height } : await measure(uri);
  const { image, area } = await cropAround(uri, size, x, y);
  const form = await fileFormData({ uri: image.uri, type: 'image/jpeg' });
  form.append('x', x.toFixed(4));
  form.append('y', y.toFixed(4));
  form.append('cropX', area.x.toFixed(4));
  form.append('cropY', area.y.toFixed(4));
  form.append('cropW', area.w.toFixed(4));
  form.append('cropH', area.h.toFixed(4));
  const tag = await apiUpload<LookTag>(`/api/looks/${look.id}/tags`, form);
  crops.set(tag.id, image);
  patchTag(queryClient, look.id, tag);

  return tag;
}

async function measure(uri: string): Promise<{ width: number; height: number }> {
  const image = await ImageManipulator.manipulate(uri).renderAsync();

  return { width: image.width, height: image.height };
}

/** Désigne le vêtement d'un point : celui reconnu par l'IA, un autre du dressing, ou celui qu'on vient d'ajouter. */
export async function confirmTag(queryClient: QueryClient, lookId: string, tagId: string, garmentIri: string): Promise<LookTag> {
  const tag = await apiRequest<LookTag>(`/api/looks/${lookId}/tags/${tagId}`, { method: 'PATCH', body: { garment: garmentIri }, accept: 'application/json' });
  patchTag(queryClient, lookId, tag);

  return tag;
}

export async function removeTag(queryClient: QueryClient, lookId: string, tag: LookTag): Promise<void> {
  await apiRequest(`/api/looks/${lookId}/tags/${tag.id}`, { method: 'DELETE' });
  crops.delete(tag.id);
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
  localPhotos.delete(lookId);
  queryClient.removeQueries({ queryKey: ['look', lookId] });
  queryClient.setQueryData(['look', 'today'], null);
}
