import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import { NAMESPACES, resources } from '@/i18n/resources';

/**
 * L'internationalisation de l'app (i18next + react-i18next) : français
 * (langue source), anglais et japonais.
 *
 * La langue : celle choisie dans « Mon profil » si elle a été choisie, sinon
 * celle du téléphone (expo-localization) si l'app la parle, sinon le
 * français. Le choix est gardé sur le téléphone comme la session
 * (expo-secure-store ; localStorage sur le web).
 *
 * Dans un composant : const { t } = useTranslation('loans'); t('list.title').
 * Hors d'un composant (une fonction de lib/) : i18n.t('loans:list.title'),
 * appelée au moment du rendu, jamais au chargement du module (sinon le
 * texte resterait figé dans la langue du démarrage).
 */
export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'penderie.language';
const SUPPORTED: readonly string[] = LANGUAGES.map((l) => l.code);

/** La langue du téléphone, si l'app la parle. */
function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? 'fr';

  return (SUPPORTED.includes(code) ? code : 'fr') as Language;
}

// Une instance propre à l'app (plutôt que l'instance globale d'i18next).
const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'fr',
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React échappe déjà
  returnNull: false,
});

// Sur le web, la page dit sa langue : sans lang="ja", le navigateur prend des
// glyphes chinois pour une partie des kanji (même caractère Unicode).
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
}

async function readChoice(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(STORAGE_KEY);
}

/** Au démarrage : reprend la langue choisie dans l'app, s'il y en a une. */
export async function restoreLanguage(): Promise<void> {
  const saved = await readChoice().catch(() => null);
  if (saved && SUPPORTED.includes(saved) && saved !== i18n.language) {
    await i18n.changeLanguage(saved);
  }
}

/** Change la langue de l'app et la garde pour les prochains lancements. */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(STORAGE_KEY, language);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, language);
    }
  } catch {
    // Stockage indisponible : la langue vaut pour cette session seulement.
  }
}

/**
 * La locale des dates et des nombres (toLocaleDateString, Intl) pour la
 * langue courante : « 12 nov. », « Nov 12 », « 11月12日 ».
 */
export function dateLocale(): string {
  return { fr: 'fr-FR', en: 'en-GB', ja: 'ja-JP' }[i18n.language as Language] ?? 'fr-FR';
}

/** Comparaison de textes (tri alphabétique) dans la langue courante. */
export function compareText(a: string, b: string): number {
  return a.localeCompare(b, i18n.language, { sensitivity: 'base' });
}

export default i18n;
