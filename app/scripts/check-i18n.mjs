#!/usr/bin/env node
/**
 * Vérifie les traductions de l'app (npm run i18n:check) :
 *  1. chaque clé utilisée dans src/ (t('…'), i18n.t('domaine:…')) existe en
 *     français ;
 *  2. chaque clé française existe en anglais et en japonais, avec les mêmes
 *     variables {{…}} ;
 *  3. aucun texte français n'est resté en dur dans le code (hors
 *     commentaires).
 * Code de sortie 1 si un problème est trouvé.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LOCALES = join(SRC, 'i18n', 'locales');
const LANGS = ['fr', 'en', 'ja'];
const PLURAL = /_(zero|one|two|few|many|other)$/;

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'i18n' ? [] : files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]]));

const dict = {};
for (const lang of LANGS) {
  dict[lang] = {};
  for (const file of readdirSync(join(LOCALES, lang))) {
    const ns = file.replace(/\.json$/, '');
    dict[lang][ns] = new Map(flatten(JSON.parse(readFileSync(join(LOCALES, lang, file), 'utf8'))));
  }
}

const problems = [];
const has = (lang, ns, key) => {
  const m = dict[lang][ns];
  if (!m) return false;
  if (m.has(key)) return true;
  // Une clé à pluriel (t('x', { count })) existe sous x_one / x_other.
  return [...m.keys()].some((k) => k.replace(PLURAL, '') === key && PLURAL.test(k));
};

// 1. Clés utilisées → présentes en français.
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
for (const path of files(SRC)) {
  const code = stripComments(readFileSync(path, 'utf8'));
  const rel = relative(SRC, path);
  const namespaces = [...code.matchAll(/useTranslation\(\s*'([a-z]+)'/g)].map((m) => m[1]);
  const defaultNs = namespaces[0] ?? 'common';
  for (const m of code.matchAll(/\b(i18n\.)?t\(\s*'([^'$]+)'/g)) {
    let [ns, key] = m[2].includes(':') ? m[2].split(':') : [defaultNs, m[2]];
    if (!m[2].includes(':') && !has('fr', ns, key)) {
      // Fichier à plusieurs useTranslation : la clé peut venir d'un autre domaine du fichier.
      ns = namespaces.find((n) => has('fr', n, key)) ?? ns;
    }
    if (!has('fr', ns, key)) problems.push(`${rel} : clé absente en français : ${ns}:${key}`);
  }
  // 3. Textes français restés en dur : une chaîne ou un texte JSX avec un accent ou une phrase.
  code.split('\n').forEach((line, i) => {
    const literal = line.match(/(['"`])((?:(?!\1).)*[a-zA-Zàâçéèêëîïôûùü]{2,} (?:(?!\1).)*[a-zàâçéèêëîïôûùü](?:(?!\1).)*)\1/);
    const jsx = line.match(/>\s*([^<>{}]*[a-zà-ü]{3,}\s[^<>{}]*[a-zà-ü])\s*</);
    const text = literal?.[2] ?? jsx?.[1];
    if (!text || /console\.(log|warn|error|info)/.test(line)) return; // journaux de dev
    if (/=>|\$\{|onPress|ReactNode/.test(text)) return; // du code entre deux chaînes, pas un texte
    if (/^(bg|text|flex|font|gap|px|py|p|m|mt|mb|items|justify|rounded|border|w|h|min|max|dark|absolute|self|overflow|opacity|shadow|z|top|left|right|bottom|inset|grid|col|row|aspect|leading|tracking|underline|uppercase|line|shrink|grow|basis|order|space|ring|size|object|transition|duration|ease|select)[\w\-/[\].:%]*( |$)/.test(text)) return;
    if (/^[\w\-/.@:()[\]{}$, *?=&|!<>+'`]+$/.test(text) && !/[à-ü]/.test(text)) {
      // Pas d'accent : n'alerter que sur une vraie phrase (plusieurs mots courants).
      if (!/\b(le|la|les|un|une|des|du|de|et|ou|pour|avec|sans|dans|sur|pas|ton|ta|tes|est|à)\b/.test(text)) return;
    }
    problems.push(`${rel}:${i + 1} : texte en dur ? « ${text.trim().slice(0, 70)} »`);
  });
}

// 2. Français → anglais et japonais, mêmes variables.
const vars = (s) => [...s.matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1]).sort().join(',');
for (const [ns, map] of Object.entries(dict.fr)) {
  for (const [key, fr] of map) {
    for (const lang of ['en', 'ja']) {
      const other = dict[lang][ns];
      const base = key.replace(PLURAL, '');
      // Le japonais n'a qu'une forme de pluriel (x_other), comparée à x_other en français.
      const own = other?.get(key);
      const value = own ?? (PLURAL.test(key) ? other?.get(`${base}_other`) : undefined);
      const reference = own === undefined && PLURAL.test(key) ? (map.get(`${base}_other`) ?? fr) : fr;
      if (value === undefined) problems.push(`${lang}/${ns}.json : clé manquante : ${key}`);
      else if (vars(value) !== vars(reference)) problems.push(`${lang}/${ns}.json : variables différentes pour ${key} : « ${value} »`);
    }
  }
}

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} problème(s).`);
  process.exit(1);
}
console.log('Traductions OK : ' + LANGS.map((l) => `${l} ${Object.values(dict[l]).reduce((n, m) => n + m.size, 0)} clés`).join(', '));
