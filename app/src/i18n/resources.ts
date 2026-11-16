/**
 * Les traductions, une par langue et par domaine (namespace i18next). Un
 * domaine = un fichier JSON par langue, dans locales/<langue>/<domaine>.json.
 *
 * Le français est la langue source : les clés sont écrites d'après lui, et
 * l'anglais et le japonais le traduisent. Une clé absente d'une langue
 * retombe sur le français (fallbackLng dans i18n/index.ts).
 */
import enAdd from './locales/en/add.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enInventory from './locales/en/inventory.json';
import enLoans from './locales/en/loans.json';
import enPlaces from './locales/en/places.json';
import enProfiles from './locales/en/profiles.json';
import enSocial from './locales/en/social.json';
import frAdd from './locales/fr/add.json';
import frAuth from './locales/fr/auth.json';
import frCommon from './locales/fr/common.json';
import frHome from './locales/fr/home.json';
import frInventory from './locales/fr/inventory.json';
import frLoans from './locales/fr/loans.json';
import frPlaces from './locales/fr/places.json';
import frProfiles from './locales/fr/profiles.json';
import frSocial from './locales/fr/social.json';
import jaAdd from './locales/ja/add.json';
import jaAuth from './locales/ja/auth.json';
import jaCommon from './locales/ja/common.json';
import jaHome from './locales/ja/home.json';
import jaInventory from './locales/ja/inventory.json';
import jaLoans from './locales/ja/loans.json';
import jaPlaces from './locales/ja/places.json';
import jaProfiles from './locales/ja/profiles.json';
import jaSocial from './locales/ja/social.json';

export const NAMESPACES = ['common', 'auth', 'home', 'inventory', 'add', 'places', 'loans', 'social', 'profiles'] as const;

export const resources = {
  fr: { common: frCommon, auth: frAuth, home: frHome, inventory: frInventory, add: frAdd, places: frPlaces, loans: frLoans, social: frSocial, profiles: frProfiles },
  en: { common: enCommon, auth: enAuth, home: enHome, inventory: enInventory, add: enAdd, places: enPlaces, loans: enLoans, social: enSocial, profiles: enProfiles },
  ja: { common: jaCommon, auth: jaAuth, home: jaHome, inventory: jaInventory, add: jaAdd, places: jaPlaces, loans: jaLoans, social: jaSocial, profiles: jaProfiles },
} as const;
