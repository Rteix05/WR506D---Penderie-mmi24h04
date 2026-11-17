import { useInfiniteQuery, useQuery, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { Href } from 'expo-router';

import { activeProfileId, apiGet, apiRequest } from '@/lib/api';

/**
 * Les notifications du profil actif (API /api/notifications) : la liste,
 * le nombre de non lues (pastille de l'accueil, relu toutes les minutes),
 * et la lecture. data dit quoi ouvrir (route de l'app).
 */
export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string | null | undefined>;
  actor: { id: string; displayName: string } | null;
  createdAt: string;
  read: boolean;
};

type Page = { notifications: AppNotification[]; unread: number; next: string | null };

const listKey = () => ['notifications', activeProfileId()];
const countKey = () => ['notifications-unread', activeProfileId()];

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: listKey(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => apiGet<Page>(`/api/notifications${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`, signal),
    getNextPageParam: (last) => last.next,
  });
}

/** Le nombre de non lues, pour la pastille : relu toutes les minutes et au retour dans l'app. */
export function useUnreadCount() {
  return useQuery({
    queryKey: countKey(),
    queryFn: async ({ signal }) => (await apiGet<{ unread: number }>('/api/notifications/unread-count', signal)).unread,
    refetchInterval: 60_000,
  });
}

function setRead(queryClient: QueryClient, ids: string[] | 'all', unread: number): void {
  queryClient.setQueryData<InfiniteData<Page>>(listKey(), (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((p) => ({ ...p, unread, notifications: p.notifications.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n)) })),
        }
      : data,
  );
  queryClient.setQueryData(countKey(), unread);
}

export async function markRead(queryClient: QueryClient, id: string): Promise<void> {
  const { unread } = await apiRequest<{ unread: number }>(`/api/notifications/${id}/read`, { method: 'POST', accept: 'application/json' });
  setRead(queryClient, [id], unread);
}

export async function markAllRead(queryClient: QueryClient): Promise<void> {
  await apiRequest(`/api/notifications/read-all`, { method: 'POST', accept: 'application/json' });
  setRead(queryClient, 'all', 0);
}

/** L'écran à ouvrir pour une notification, ou null s'il n'y a rien à ouvrir (résultat d'un signalement…). */
export function targetOf(n: AppNotification): Href | null {
  const d = n.data;
  if (d.post) return { pathname: '/fil/[id]', params: { id: d.post } };
  if (d.loan) return { pathname: '/pret/[id]', params: { id: d.loan } };
  if (d.targetType === 'ITEM' && d.targetId) return { pathname: '/objet/[id]', params: { id: d.targetId } };
  if (d.targetType === 'GARMENT' && d.targetId) return { pathname: '/vetement/[id]', params: { id: d.targetId } };

  return null;
}

/** La couleur d'une notification (charte : prêté, en cours, en retard, terminé). */
export function toneOf(n: AppNotification): 'primary' | 'main' | 'error' | 'muted' {
  if (['LOAN_OVERDUE', 'ITEM_LOST'].includes(n.type)) return 'error';
  if (n.type === 'MODERATION_ACTION') return n.data.report && n.data.decision ? 'main' : 'error';
  if (['LOAN_RETURNED', 'APPROVAL_DECIDED', 'REFUND_ISSUED'].includes(n.type)) return 'muted';
  if (['FRIEND_ACCEPTED', 'LOAN_ACCEPTED', 'ORDER_PAID', 'LISTING_SOLD', 'FOLLOW_MUTUAL'].includes(n.type)) return 'main';

  return 'primary';
}
