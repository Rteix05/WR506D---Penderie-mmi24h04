import { loadStoredSession, storeSession, type StoredSession } from '@/lib/session';

/**
 * Accès à l'API Symfony (dossier /api du dépôt).
 *
 * L'adresse vient de EXPO_PUBLIC_API_URL (fichier .env, surchargé par
 * .env.local). Expo injecte les variables EXPO_PUBLIC_* dans le code au
 * moment du bundle : elles sont donc lisibles par n'importe qui, jamais de
 * secret dedans.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Erreurs de validation champ par champ (422), clé = propertyPath. */
    public readonly violations: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Session en mémoire
// ---------------------------------------------------------------------------

/**
 * La session courante, copie en mémoire de ce qui est rangé dans le
 * trousseau (voir session.ts). null = déconnecté.
 */
let session: StoredSession | null = null;

type Listener = (signedIn: boolean) => void;
const listeners = new Set<Listener>();

/** Prévient l'écran racine quand on se connecte ou qu'on est déconnecté. */
export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

async function setSession(next: StoredSession | null): Promise<void> {
  const changed = (session === null) !== (next === null);
  session = next;
  await storeSession(next);
  if (changed) {
    listeners.forEach((listener) => listener(next !== null));
  }
}

/** Au lancement : relit la session du trousseau. true si on est connecté. */
export async function restoreSession(): Promise<boolean> {
  session = await loadStoredSession();

  return session !== null;
}

export function activeProfileId(): string | null {
  return session?.profileId ?? null;
}

/** Change le profil actif : les requêtes suivantes partent avec ce X-Profile. */
export async function setActiveProfileId(profileId: string | null): Promise<void> {
  if (session !== null) {
    await setSession({ ...session, profileId });
  }
}

// ---------------------------------------------------------------------------
// Connexion, inscription, déconnexion
// ---------------------------------------------------------------------------

type Tokens = { token: string; refreshToken: string };

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status === 401) {
    throw new ApiError(401, 'E-mail ou mot de passe incorrect.');
  }
  if (!response.ok) {
    throw await toApiError(response, 'Connexion impossible');
  }
  const tokens = (await response.json()) as Tokens;
  await setSession({ token: tokens.token, refreshToken: tokens.refreshToken, profileId: null });
}

export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** AAAA-MM-JJ */
  dateOfBirth: string;
  username: string;
};

/** Crée le compte et son premier profil (adulte), puis connecte. */
export async function register(payload: RegisterPayload): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, 'Inscription impossible');
  }
  await login(payload.email, payload.password);
}

/**
 * Déconnexion locale : on oublie les jetons. L'API n'a pas (encore) de route
 * pour révoquer le jeton de rafraîchissement ; il expire seul au bout de 30
 * jours, et il est à usage unique.
 */
export async function logout(): Promise<void> {
  await setSession(null);
}

// ---------------------------------------------------------------------------
// Rafraîchissement du jeton
// ---------------------------------------------------------------------------

/**
 * Un seul rafraîchissement à la fois : si cinq requêtes reçoivent un 401 en
 * même temps, elles attendent toutes la même promesse. Indispensable, car le
 * jeton de rafraîchissement est à usage unique : un deuxième appel avec le
 * même jeton serait refusé et déconnecterait l'utilisateur.
 */
let refreshing: Promise<boolean> | null = null;

function refresh(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  const current = session;
  if (current === null) {
    return false;
  }
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  if (response.status === 401) {
    // Jeton expiré ou déjà utilisé : retour à l'écran de connexion.
    await setSession(null);

    return false;
  }
  if (!response.ok) {
    // Panne de l'API : on garde la session, la requête échouera normalement.
    throw await toApiError(response, 'Rafraîchissement de la session impossible');
  }
  const tokens = (await response.json()) as Tokens;
  await setSession({ ...current, ...tokens });

  return true;
}

// ---------------------------------------------------------------------------
// Requêtes
// ---------------------------------------------------------------------------

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Objet envoyé en JSON, ou FormData pour un envoi de fichier. */
  body?: unknown;
  signal?: AbortSignal;
  /** Format de la réponse : JSON-LD (défaut d'API Platform) ou JSON simple. */
  accept?: 'application/ld+json' | 'application/json';
};

/**
 * Requête authentifiée : ajoute le jeton (Authorization) et le profil actif
 * (X-Profile). Sur un 401, rafraîchit le jeton une fois et rejoue la requête.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);
  if (response.status === 401 && session !== null && (await refresh())) {
    response = await send(path, options);
  }
  if (response.status === 401) {
    throw new ApiError(401, 'Session expirée, reconnecte-toi.');
  }
  if (!response.ok) {
    throw await toApiError(response, `${options.method ?? 'GET'} ${path}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function send(path: string, { method = 'GET', body, signal, accept = 'application/ld+json' }: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: accept };
  if (session !== null) {
    headers.Authorization = `Bearer ${session.token}`;
    if (session.profileId !== null) {
      headers['X-Profile'] = session.profileId;
    }
  }
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    // Pas de Content-Type : fetch l'écrit lui-même avec la frontière (boundary).
    payload = body;
  } else if (body !== undefined) {
    // Formats d'entrée d'API Platform : JSON-LD pour POST/PUT (application/json
    // est refusé en 415), merge-patch+json pour un PATCH.
    headers['Content-Type'] = method === 'PATCH' ? 'application/merge-patch+json' : 'application/ld+json';
    payload = JSON.stringify(body);
  }

  return fetch(`${API_URL}${path}`, { method, headers, body: payload, signal });
}

/**
 * Source d'image pour expo-image : une photo de l'API (GET /api/media/{id})
 * est privée, elle part donc avec le jeton et le profil actif. Le téléphone
 * la garde en cache (Cache-Control: private côté API).
 */
export function mediaSource(path: string): { uri: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  if (session !== null) {
    headers.Authorization = `Bearer ${session.token}`;
    if (session.profileId !== null) headers['X-Profile'] = session.profileId;
  }

  return { uri: `${API_URL}${path}`, headers };
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { signal });
}

/** POST multipart (envoi de fichier), réponse en JSON simple. */
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: form, accept: 'application/json' });
}

type Problem = {
  detail?: string;
  description?: string;
  title?: string;
  message?: string;
  violations?: { propertyPath: string; message?: string; title?: string }[];
};

/**
 * Le validateur de Symfony répond en anglais tant que l'API n'a pas de
 * traductions françaises (symfony/translation) : on traduit ici les
 * messages qu'un utilisateur peut réellement rencontrer à l'inscription.
 */
const FRENCH: Record<string, string> = {
  'This value is not a valid email address.': 'Cette adresse e-mail ne semble pas valide.',
  'This password has been leaked in a data breach, it must not be used. Please use another password.':
    'Ce mot de passe figure dans une fuite de données connue : choisis-en un autre.',
  'This value should not be blank.': 'Ce champ est obligatoire.',
};

/**
 * Traduit une réponse d'erreur en message lisible. L'API répond selon les
 * cas en problem+json (API Platform), en hydra:Error, ou en { title,
 * violations } (inscription) : on prend le premier champ parlant.
 */
async function toApiError(response: Response, fallback: string): Promise<ApiError> {
  const problem = (await response.json().catch(() => null)) as Problem | null;
  const violations: Record<string, string> = {};
  // Deux formats selon la route : { message } (nos contrôleurs) ou { title }
  // (validation du corps par #[MapRequestPayload]).
  for (const violation of problem?.violations ?? []) {
    const text = violation.message ?? violation.title ?? '';
    violations[violation.propertyPath] ??= FRENCH[text] ?? text;
  }
  const first = Object.values(violations)[0];
  const message = first ?? problem?.detail ?? problem?.description ?? problem?.message ?? problem?.title ?? `${fallback} (${response.status})`;

  return new ApiError(response.status, message, violations);
}
