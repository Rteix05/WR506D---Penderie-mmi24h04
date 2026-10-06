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
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * GET sur l'API, réponse en JSON-LD (format par défaut d'API Platform).
 * Le jeton JWT sera ajouté ici par la feature authentification.
 */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/ld+json' },
    signal,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} → ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Jeton JWT gardé en mémoire : il disparaît au rechargement de l'app. Assez
 * pour l'écran de test du scan ; la feature authentification le rangera
 * dans expo-secure-store et gérera le rafraîchissement.
 */
let token: string | null = null;

export function isLoggedIn(): boolean {
  return token !== null;
}

export function logout(): void {
  token = null;
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, response.status === 401 ? 'E-mail ou mot de passe incorrect.' : `Connexion → ${response.status}`);
  }
  token = ((await response.json()) as { token: string }).token;
}

/**
 * POST multipart (envoi de fichier). Pas d'en-tête Content-Type : fetch
 * l'écrit lui-même avec la frontière (boundary) du multipart.
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (response.status === 401) {
    token = null;
    throw new ApiError(401, 'Session expirée, reconnecte-toi.');
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(response.status, problem?.detail ?? `POST ${path} → ${response.status}`);
  }

  return response.json() as Promise<T>;
}
