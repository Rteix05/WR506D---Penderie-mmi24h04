import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * La session gardée sur le téléphone, entre deux lancements de l'app.
 *
 * - token : le jeton d'accès JWT (15 min). Gardé aussi pour éviter un
 *   rafraîchissement à chaque ouverture tant qu'il est valide.
 * - refreshToken : le jeton de rafraîchissement (30 jours, à usage unique :
 *   l'API en renvoie un nouveau à chaque rafraîchissement).
 * - profileId : le profil actif choisi dans l'app (en-tête X-Profile). Vide =
 *   le profil par défaut du compte, choisi par l'API.
 *
 * Sur téléphone, tout va dans le trousseau chiffré (expo-secure-store :
 * Keychain iOS, Keystore Android). expo-secure-store n'existe pas sur le
 * web : la version web, qui ne sert qu'au développement, se rabat sur
 * localStorage.
 */
export type StoredSession = {
  token: string;
  refreshToken: string;
  profileId: string | null;
};

const KEYS = {
  token: 'penderie.token',
  refreshToken: 'penderie.refreshToken',
  profileId: 'penderie.profileId',
} as const;

async function read(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        globalThis.localStorage?.removeItem(key);
      } else {
        globalThis.localStorage?.setItem(key, value);
      }
    } catch {
      // Stockage indisponible (navigation privée) : la session ne survivra
      // pas au rechargement, l'app reste utilisable.
    }

    return;
  }

  if (value === null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const [token, refreshToken, profileId] = await Promise.all([read(KEYS.token), read(KEYS.refreshToken), read(KEYS.profileId)]);
  if (token === null || refreshToken === null) {
    return null;
  }

  return { token, refreshToken, profileId };
}

export async function storeSession(session: StoredSession | null): Promise<void> {
  await Promise.all([
    write(KEYS.token, session?.token ?? null),
    write(KEYS.refreshToken, session?.refreshToken ?? null),
    write(KEYS.profileId, session?.profileId ?? null),
  ]);
}
