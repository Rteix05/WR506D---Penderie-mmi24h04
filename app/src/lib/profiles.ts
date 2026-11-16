import { useQuery, type QueryClient } from '@tanstack/react-query';

import i18n from '@/i18n';
import { apiGet, apiRequest } from '@/lib/api';
import type { ProfileType } from '@/lib/auth';

/**
 * Les profils du compte (API /api/account/profiles) : un compte, c'est
 * une connexion et plusieurs identités, chacune avec sa penderie. L'adulte
 * inscrit (ADULT) crée des profils enfant (CHILD, sous sa tutelle) et
 * proches (RELATIVE : majeurs qu'il gère), les modifie et règle leurs
 * autorisations.
 */
export type AccountProfile = {
  id: string;
  '@id': string;
  type: ProfileType;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  dateOfBirth: string;
  age: number;
  bio: string | null;
  isDefault: boolean;
  suspended: boolean;
  createdAt: string | null;
  guardian: { id: string; displayName: string } | null;
  counts: { items: number; garments: number; activeLoans: number };
  /** Le profil actif. */
  active: boolean;
  /** Le profil actif peut le modifier et régler ses autorisations. */
  canManage: boolean;
  /** Le profil actif en est le tuteur : il peut le supprimer. */
  canDelete: boolean;
};

export type PermissionKey =
  | 'ITEM_CREATE'
  | 'GARMENT_MANAGE'
  | 'COLLECTION_CREATE'
  | 'MEDIA_UPLOAD'
  | 'LOAN_BORROW'
  | 'LOAN_LEND'
  | 'SHARE_CREATE'
  | 'FRIEND_ADD'
  | 'COMMENT_WRITE'
  | 'FOLLOW'
  | 'PURCHASE'
  | 'SELL';
export type PermissionMode = 'ALLOWED' | 'REQUIRES_APPROVAL' | 'DENIED';

export type ProfilePermissions = {
  profile: string;
  type: ProfileType;
  canManage: boolean;
  permissions: { permission: PermissionKey; mode: PermissionMode; default: PermissionMode; custom: boolean }[];
};

/** « Profil principal », « Profil famille », « Profil enfant » (vocabulaire de la maquette). */
export function profileKind(p: Pick<AccountProfile, 'type' | 'isDefault'>): string {
  if (p.isDefault) return i18n.t('profiles:kind.default');

  return p.type === 'CHILD' ? i18n.t('profiles:kind.child') : p.type === 'RELATIVE' ? i18n.t('profiles:kind.relative') : i18n.t('profiles:kind.adult');
}

/** « Profil enfant · 9 ans · 18 objets » */
export function profileMeta(p: AccountProfile): string {
  const owned = p.counts.items + p.counts.garments;

  return [
    profileKind(p),
    p.type === 'CHILD' ? i18n.t('profiles:meta.age', { age: p.age }) : null,
    i18n.t('profiles:meta.items', { count: owned }),
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Les autorisations, groupées comme dans la maquette (« Autorisations
 * parentales ») : un titre et une ligne d'explication par permission.
 */
export function permissionGroups(): { title: string; items: { key: PermissionKey; title: string; text: string }[] }[] {
  return [
    {
      title: i18n.t('profiles:permissions.groups.organize'),
      items: [
        { key: 'ITEM_CREATE', title: i18n.t('profiles:permissions.items.itemCreate.title'), text: i18n.t('profiles:permissions.items.itemCreate.text') },
        { key: 'GARMENT_MANAGE', title: i18n.t('profiles:permissions.items.garmentManage.title'), text: i18n.t('profiles:permissions.items.garmentManage.text') },
        { key: 'COLLECTION_CREATE', title: i18n.t('profiles:permissions.items.collectionCreate.title'), text: i18n.t('profiles:permissions.items.collectionCreate.text') },
        { key: 'MEDIA_UPLOAD', title: i18n.t('profiles:permissions.items.mediaUpload.title'), text: i18n.t('profiles:permissions.items.mediaUpload.text') },
      ],
    },
    {
      title: i18n.t('profiles:permissions.groups.loans'),
      items: [
        { key: 'LOAN_LEND', title: i18n.t('profiles:permissions.items.loanLend.title'), text: i18n.t('profiles:permissions.items.loanLend.text') },
        { key: 'LOAN_BORROW', title: i18n.t('profiles:permissions.items.loanBorrow.title'), text: i18n.t('profiles:permissions.items.loanBorrow.text') },
      ],
    },
    {
      title: i18n.t('profiles:permissions.groups.relations'),
      items: [
        { key: 'FRIEND_ADD', title: i18n.t('profiles:permissions.items.friendAdd.title'), text: i18n.t('profiles:permissions.items.friendAdd.text') },
        { key: 'SHARE_CREATE', title: i18n.t('profiles:permissions.items.shareCreate.title'), text: i18n.t('profiles:permissions.items.shareCreate.text') },
        { key: 'COMMENT_WRITE', title: i18n.t('profiles:permissions.items.commentWrite.title'), text: i18n.t('profiles:permissions.items.commentWrite.text') },
        { key: 'FOLLOW', title: i18n.t('profiles:permissions.items.follow.title'), text: i18n.t('profiles:permissions.items.follow.text') },
      ],
    },
    {
      title: i18n.t('profiles:permissions.groups.trade'),
      items: [
        { key: 'SELL', title: i18n.t('profiles:permissions.items.sell.title'), text: i18n.t('profiles:permissions.items.sell.text') },
        { key: 'PURCHASE', title: i18n.t('profiles:permissions.items.purchase.title'), text: i18n.t('profiles:permissions.items.purchase.text') },
      ],
    },
  ];
}

export function modes(): { value: PermissionMode; label: string }[] {
  return [
    { value: 'ALLOWED', label: i18n.t('profiles:modes.allowed') },
    { value: 'REQUIRES_APPROVAL', label: i18n.t('profiles:modes.approval') },
    { value: 'DENIED', label: i18n.t('profiles:modes.denied') },
  ];
}

export function modeLabel(mode: PermissionMode): string {
  return { ALLOWED: i18n.t('profiles:modes.allowedShort'), REQUIRES_APPROVAL: i18n.t('profiles:modes.approvalShort'), DENIED: i18n.t('profiles:modes.deniedShort') }[mode];
}

export function useAccountProfiles() {
  return useQuery({ queryKey: ['account', 'profiles'], queryFn: ({ signal }) => apiRequest<AccountProfile[]>('/api/account/profiles', { signal, accept: 'application/json' }) });
}

export function useAccountProfile(id: string) {
  const all = useAccountProfiles();

  return { ...all, data: all.data?.find((p) => p.id === id) };
}

export function usePermissions(id: string) {
  return useQuery({ queryKey: ['account', 'permissions', id], queryFn: ({ signal }) => apiGet<ProfilePermissions>(`/api/account/profiles/${id}/permissions`, signal) });
}

/** Après un changement : la liste des profils et le sélecteur (/api/me) se rechargent. */
async function refresh(queryClient: QueryClient) {
  await Promise.all([queryClient.invalidateQueries({ queryKey: ['account'] }), queryClient.invalidateQueries({ queryKey: ['me'] })]);
}

export type NewProfile = { type: 'CHILD' | 'RELATIVE'; firstName: string; dateOfBirth: string };

export async function createProfile(queryClient: QueryClient, input: NewProfile): Promise<AccountProfile> {
  const profile = await apiRequest<AccountProfile>('/api/account/profiles', { method: 'POST', body: input, accept: 'application/json' });
  await refresh(queryClient);

  return profile;
}

export async function updateProfile(queryClient: QueryClient, id: string, patch: Partial<Pick<AccountProfile, 'firstName' | 'lastName' | 'displayName' | 'dateOfBirth' | 'bio' | 'type'>>): Promise<AccountProfile> {
  const profile = await apiRequest<AccountProfile>(`/api/account/profiles/${id}`, { method: 'PATCH', body: patch, accept: 'application/json' });
  await refresh(queryClient);

  return profile;
}

export async function savePermissions(queryClient: QueryClient, id: string, modes: Partial<Record<PermissionKey, PermissionMode>>): Promise<ProfilePermissions> {
  const saved = await apiRequest<ProfilePermissions>(`/api/account/profiles/${id}/permissions`, { method: 'PUT', body: { modes }, accept: 'application/json' });
  queryClient.setQueryData(['account', 'permissions', id], saved);

  return saved;
}

export async function deleteProfile(queryClient: QueryClient, id: string): Promise<void> {
  await apiRequest(`/api/profiles/${id}`, { method: 'DELETE' });
  await refresh(queryClient);
}

/** « 12/03/2016 » ⇄ « 2016-03-12 » : la date se saisit à la française. */
export function parseFrenchDate(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function frenchDate(iso: string): string {
  const [y, m, d] = iso.split('-');

  return `${d}/${m}/${y}`;
}
