# Penderie — reconstruction des composants (Nav / Friends / Vetements)

`rebuild-components.js` recrée proprement, **par script**, les 3 composants
directement sur la page **Components** du fichier Figma `WR506D - Penderie`.
(Mon accès Figma est en lecture seule — c'est la seule voie pour écrire dans le fichier.)

## Lancer

1. Dans Figma, installe le plugin **Scripter** (Rasmus Andersson) si ce n'est pas fait.
2. Ouvre `WR506D - Penderie`, place-toi sur la page **Components**.
3. `Plugins → Scripter`, colle tout le contenu de `rebuild-components.js`, clique ▶ Run.
4. À la fin : notification verte + zoom sur les 3 nouveaux composants, créés
   sous l'étiquette « ▸ v2 — reconstruits proprement » en bas de la page.

Rien n'est supprimé : tes anciens composants restent à côté. Tu compares, puis
tu remplaces les instances et tu supprimes les anciens quand tu es d'accord.

## Ce qui est créé

| Composant | Détail |
|---|---|
| `Nav` | Barre 393×64, fond `#D31D66`, 5 icônes (home / activité ×2 / map / profil) en `space-between`, auto-layout. |
| `Friends` | Set de variantes `Player = 1st / 2nd / 3rd`. Avatar 68px (photo + anneau médaille or/argent/bronze), nom, rang « Xst : Ykg ». |
| `Vetements` | Set de variantes `Type = Tshirt / Jacket / Coat / Short / Pants / Sweatpants / Women / Men / Cap / Scarf`. Carte rose `#FFB3E0` + contour 2px, icône, libellé. |

## Écarts assumés vs. l'original (nettoyage)

- Variantes renommées (fini `Cloth item=Rice`, `Cloth item2`…).
- Cartes Vetements **uniformisées** : toutes avec fond rose + contour 2px
  (l'original en mélangeait avec/sans contour).
- Libellé Vetements en `#1A1E24` : l'original `#F8FAFC` était illisible sur le rose.
  → pour revenir à l'original, change `LABEL_COLOR` en haut du script.
- La 11ᵉ variante d'origine (doublon de Tshirt) n'est pas reprise.
- Police : le script essaie **Luciole**, puis Inter / Roboto / Arial en secours.
  La notification finale indique laquelle a été utilisée.

## Assets

`../figma-assets/` contient les SVG et photos exportés du fichier d'origine
(les SVG sont déjà intégrés dans le script ; le dossier sert de référence).
