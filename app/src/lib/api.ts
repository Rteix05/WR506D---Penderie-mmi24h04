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
