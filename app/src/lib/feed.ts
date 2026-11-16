import { useInfiniteQuery, useQuery, type QueryClient } from '@tanstack/react-query';

import i18n, { dateLocale } from '@/i18n';
import { apiGet, apiRequest } from '@/lib/api';

/**
 * Le fil d'actualité (API /api/feed, /api/posts, /api/profiles/{id}/page).
 * Pour l'instant on y publie le look du jour : ses points deviennent des
 * mentions, comme sur Instagram. Publier partage les vêtements pointés,
 * en lecture, aux personnes choisies ; supprimer la publication les rend
 * de nouveau privés.
 */
export type Audience = 'FRIENDS' | 'FOLLOWERS';

export function audienceLabels(): Record<Audience, { title: string; chip: string; detail: string }> {
  return {
    FRIENDS: { title: i18n.t('social:audience.friends.title'), chip: i18n.t('social:audience.friends.chip'), detail: i18n.t('social:audience.friends.detail') },
    FOLLOWERS: { title: i18n.t('social:audience.followers.title'), chip: i18n.t('social:audience.followers.chip'), detail: i18n.t('social:audience.followers.detail') },
  };
}

export type PostAuthor = { id: string; displayName: string; username: string };

/** Un vêtement mentionné : son nom toujours, le reste seulement si on peut l'ouvrir. */
export type MentionGarment = {
  id: string;
  name: string;
  category: string;
  canView: boolean;
  brand?: string | null;
  size?: string | null;
  colors?: string[];
  photo?: string | null;
};

export type Mention = { position: number; x: number; y: number; garment: MentionGarment };

export type Post = {
  id: string;
  author: PostAuthor;
  publishedAt: string;
  audience: Audience | 'SPECIFIC';
  body: string | null;
  commentsEnabled: boolean;
  canDelete: boolean;
  photo: { url: string; width: number | null; height: number | null } | null;
  look: { id: string; wornOn: string; tags: Mention[] } | null;
};

export type ProfilePage = {
  profile: PostAuthor & { bio: string | null };
  relation: { self: boolean; household: boolean; friend: boolean; following: boolean };
  posts: Post[];
  garments: MentionGarment[];
};

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => apiGet<{ posts: Post[]; next: string | null }>(`/api/feed${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`, signal),
    getNextPageParam: (last) => last.next,
  });
}

export function usePost(id: string) {
  return useQuery({ queryKey: ['post', id], queryFn: ({ signal }) => apiGet<Post>(`/api/posts/${id}`, signal) });
}

export function useProfilePage(id: string | null | undefined) {
  return useQuery({
    queryKey: ['profile-page', id],
    queryFn: ({ signal }) => apiGet<ProfilePage>(`/api/profiles/${id}/page`, signal),
    enabled: Boolean(id),
  });
}

export async function publishLook(queryClient: QueryClient, lookId: string, audience: Audience, body: string): Promise<Post> {
  const post = await apiRequest<Post>(`/api/looks/${lookId}/publish`, { method: 'POST', body: { audience, body: body.trim() || null } });
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['feed'] }),
    queryClient.invalidateQueries({ queryKey: ['look'] }),
    queryClient.invalidateQueries({ queryKey: ['profile-page'] }),
  ]);

  return post;
}

export async function deletePost(queryClient: QueryClient, id: string): Promise<void> {
  await apiRequest(`/api/posts/${id}`, { method: 'DELETE' });
  queryClient.removeQueries({ queryKey: ['post', id] });
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['feed'] }),
    queryClient.invalidateQueries({ queryKey: ['look'] }),
    queryClient.invalidateQueries({ queryKey: ['profile-page'] }),
  ]);
}

/** « il y a 2 h », « hier », « il y a 3 j », puis la date (maquette du fil). */
export function since(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return i18n.t('social:since.now');
  if (minutes < 60) return i18n.t('social:since.minutes', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t('social:since.hours', { hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return i18n.t('social:since.yesterday');
  if (days < 7) return i18n.t('social:since.days', { days });

  return date.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' });
}
