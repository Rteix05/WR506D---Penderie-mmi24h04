import { useQuery, type QueryClient } from '@tanstack/react-query';

import { activeProfileId, apiGet, apiRequest } from '@/lib/api';
import type { PostAuthor } from '@/lib/feed';

/**
 * Amis et abonnements (API /api/friends, /api/follows, /api/people/search,
 * /api/approvals). Les notifications correspondantes arrivent dans l'app
 * et en push.
 */
export type Relation = {
  friend: boolean;
  request: { id: string; direction: 'sent' | 'received'; awaitingGuardian: boolean } | null;
  following: boolean;
  followsMe: boolean;
};

export type PersonResult = PostAuthor & { relation: Relation };
export type FriendRequest = { id: string; status: string; profile: PostAuthor; direction: 'sent' | 'received'; requestedAt: string; awaitingGuardian?: boolean };
export type Approval = { id: string; permission: string; requester: { id: string; displayName: string }; subject: PostAuthor | null; createdAt: string };

const keys = {
  friends: () => ['friends', activeProfileId()],
  requests: () => ['friend-requests', activeProfileId()],
  approvals: () => ['approvals', activeProfileId()],
};

export function useFriends() {
  return useQuery({ queryKey: keys.friends(), queryFn: async ({ signal }) => (await apiGet<{ friends: PostAuthor[] }>('/api/friends', signal)).friends });
}

export function useFriendRequests() {
  return useQuery({ queryKey: keys.requests(), queryFn: ({ signal }) => apiGet<{ received: FriendRequest[]; sent: FriendRequest[] }>('/api/friends/requests', signal) });
}

/** Ce qui attend ma décision de tuteur (demandes d'ami d'un profil enfant). */
export function useApprovals() {
  return useQuery({ queryKey: keys.approvals(), queryFn: async ({ signal }) => (await apiGet<{ approvals: Approval[] }>('/api/approvals', signal)).approvals });
}

export function usePeopleSearch(q: string) {
  return useQuery({
    queryKey: ['people-search', activeProfileId(), q],
    queryFn: async ({ signal }) => (await apiGet<{ profiles: PersonResult[] }>(`/api/people/search?q=${encodeURIComponent(q)}`, signal)).profiles,
    enabled: q.trim().length >= 2,
  });
}

/** Après chaque geste : la page profil, les listes et la recherche se relisent. */
async function refresh(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    ['friends', 'friend-requests', 'approvals', 'people-search', 'profile-page', 'feed', 'notifications', 'notifications-unread'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })),
  );
}

const post = (path: string, body?: Record<string, unknown>) => apiRequest(path, { method: 'POST', body: body ?? {}, accept: 'application/json' });
const del = (path: string) => apiRequest(path, { method: 'DELETE' });

export async function askFriend(queryClient: QueryClient, profileId: string): Promise<void> {
  await post('/api/friends/requests', { profile: profileId });
  await refresh(queryClient);
}

export async function answerRequest(queryClient: QueryClient, requestId: string, accept: boolean): Promise<void> {
  await post(`/api/friends/requests/${requestId}/${accept ? 'accept' : 'decline'}`);
  await refresh(queryClient);
}

export async function cancelRequest(queryClient: QueryClient, requestId: string): Promise<void> {
  await del(`/api/friends/requests/${requestId}`);
  await refresh(queryClient);
}

export async function unfriend(queryClient: QueryClient, profileId: string): Promise<void> {
  await del(`/api/friends/${profileId}`);
  await refresh(queryClient);
}

export async function follow(queryClient: QueryClient, profileId: string): Promise<void> {
  await post('/api/follows', { profile: profileId });
  await refresh(queryClient);
}

export async function unfollow(queryClient: QueryClient, profileId: string): Promise<void> {
  await del(`/api/follows/${profileId}`);
  await refresh(queryClient);
}

export async function decideApproval(queryClient: QueryClient, approvalId: string, approve: boolean): Promise<void> {
  await post(`/api/approvals/${approvalId}/${approve ? 'approve' : 'reject'}`);
  await refresh(queryClient);
}
