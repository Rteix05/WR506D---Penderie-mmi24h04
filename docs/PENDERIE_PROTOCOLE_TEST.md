# Penderie — Protocole de test d'utilisabilité

Objet : faire manipuler le prototype v2 à cinq personnes qui ne connaissent
pas le projet, pour savoir si les parcours se comprennent sans explication.

À lire avant : `PENDERIE_PRINCIPES_UX.md`. Le test vérifie que les
principes tiennent devant quelqu'un d'autre — ce n'est pas la même chose
que de les avoir appliqués.

---

## 1. Ce qu'on cherche à savoir

Cinq questions précises. Tout le reste est du bonus.

1. **La localisation est-elle comprise ?** Un participant retrouve-t-il un
   objet et sait-il dire où il est rangé, sans qu'on lui explique la
   hiérarchie logement › pièce › rangement › carton ?
2. **L'ajout est-il évident ?** Trouve-t-il par où ajouter quelque chose,
   et comprend-il le scan comme un raccourci plutôt que comme une
   obligation ?
3. **Le caractère privé est-il perçu ?** Croit-il que ses affaires sont
   visibles par ses amis par défaut ? C'est le principe fondateur de
   l'app : s'il n'est pas perçu, il n'existe pas.
4. **La différence objet / vêtement est-elle claire ?** Sait-il où
   retrouver un t-shirt plutôt qu'une perceuse, et pourquoi ?
5. **Le prêt est-il lisible ?** Sait-il qui a quoi, et jusqu'à quand ?

---

## 2. Participants

**Cinq personnes.** Cinq suffisent pour faire apparaître l'essentiel des
problèmes d'interface ; au-delà, on revoit les mêmes. En revanche cinq ne
mesurent rien : ce test **détecte** des problèmes, il ne prouve pas qu'une
version est meilleure qu'une autre.

**Profil recherché** : 18–35 ans, possède des affaires qu'il prête ou
range (outils, vêtements, matériel), utilise un smartphone quotidiennement,
**n'est ni designer ni développeur**.

**À exclure** : toute personne à qui la maquette a déjà été montrée, et les
gens qui ont participé au cadrage. Ils ne peuvent plus découvrir
l'interface.

**Bon à avoir** : au moins un participant qui n'a jamais prêté d'objet à un
ami, pour voir si le concept lui parle.

---

## 3. Matériel et conditions

- Le prototype Figma en mode présentation, **sur téléphone** si possible
  (l'app est mobile ; tester à la souris fausse la perception des cibles).
- Les 19 flows sont déjà en place : chaque tâche démarre sur son flow, pas
  au hasard dans la maquette.
- Un enregistrement d'écran et de voix — **avec accord explicite**, et
  supprimé après analyse.
- La grille d'observation, une par participant, imprimée ou à l'écran.
- 30 à 40 minutes par personne.
- Un seul observateur. À deux, le participant se sent évalué.

---

## 4. Déroulé d'une séance

**Accueil (3 min).** À dire, à peu près mot pour mot :

> « Je te montre une maquette d'application pour ranger et prêter ses
> affaires. **C'est l'application qu'on teste, pas toi** : si quelque chose
> te bloque, c'est un problème de notre côté, et c'est exactement ce que je
> cherche. Dis à voix haute ce que tu cherches, ce que tu comprends, ce qui
> te surprend. Je ne pourrai pas t'aider pendant les tâches — c'est normal,
> ce n'est pas de la méchanceté. Tout n'est pas cliquable : si un bouton ne
> répond pas, dis-le et on continue. Tu peux t'arrêter quand tu veux. »

**Les cinq tâches (25 min).** Une par une, énoncée à voix haute et laissée
sous les yeux. On ne relance qu'après **une minute de blocage complet**, et
on note la relance.

**Questions de fin (7 min).** Voir §6.

---

## 5. Les tâches

Règle d'or : **le scénario ne doit jamais contenir le vocabulaire de
l'interface.** Si on dit « ajoute un objet », on teste la lecture d'un
libellé, pas la compréhension. Mots à ne pas prononcer : *ajouter,
scanner, carton, dressing, tenue, partager, prêter, inventaire*, sauf quand
ils désignent une chose du monde réel (un carton en est une).

### T1 — Faire entrer une chose dans l'application
*Flow de départ : « 02 · Accueil ».*

> « Tu viens d'acheter une perceuse. Tu veux pouvoir la retrouver dans six
> mois, quand tu auras oublié où tu l'as mise. Vas-y. »

- **Chemin attendu** : bouton + → Vêtements et Objets → Objet → Scanner ou
  ajout manuel → informations → emplacement → vérification → confirmation.
- **Réussi si** : l'objet est enregistré avec un emplacement, sans relance.
- **À observer** : trouve-t-il le bouton + ? Choisit-il le scan ou la
  saisie ? Comprend-il qu'il doit dire *où* il range ?

### T2 — Retrouver une chose
*Flow de départ : « 04 · Gérer un objet ».*

> « Un ami t'appelle : il cherche une perceuse. Dis-moi si tu en as une, et
> où elle est exactement. »

- **Chemin attendu** : recherche ou inventaire → fiche objet → lecture du
  chemin complet.
- **Réussi si** : il énonce les quatre niveaux (maison, garage, étagère,
  carton) sans qu'on lui demande de préciser.
- **À observer** : passe-t-il par la recherche ou par la navigation ? Lit-il
  le fil d'Ariane comme une adresse ?

### T3 — Prêter, puis savoir où c'est passé
*Flow de départ : « 09 · Prêter un objet ».*

> « Tu lui prêtes la perceuse, il te la rend avant la fin du mois. Fais ce
> qu'il faut. Ensuite, imagine qu'on est trois jours plus tard : qu'est-ce
> que tu as prêté, et à qui ? »

- **Chemin attendu** : fiche objet → Prêter → choix de l'ami → date →
  vérification → confirmation, puis Mes prêts.
- **Réussi si** : le prêt est enregistré avec une date, et il retrouve
  ensuite la liste de ce qu'il a prêté.
- **À observer** : comprend-il que l'objet change d'état ? Voit-il la
  différence entre *j'ai prêté* et *j'ai emprunté* ?

### T4 — S'habiller
*Flow de départ : « 08 · Suggestion de tenue ».*

> « Tu as un entretien demain, il fait 18 degrés et il pleut un peu.
> Regarde ce que l'application te propose de mettre. »

- **Chemin attendu** : Ma tenue → préférences ou suggestion directe →
  accepter ou remplacer une pièce.
- **Réussi si** : il obtient une tenue et sait comment en demander une
  autre.
- **À observer** : comprend-il que la suggestion tient compte de la météo
  et de ce qu'il a déjà porté ? Cherche-t-il ses vêtements dans
  l'inventaire plutôt que dans le dressing ?

### T5 — Ranger en vrac
*Flow de départ : « 19 · Créer un carton ».*

> « Tu remballes tout ton matériel de bricolage dans un carton que tu poses
> sur l'étagère du garage. Fais-le dans l'application. »

- **Chemin attendu** : bouton + → Cartons → étiquette → emplacement →
  contenu → vérification → confirmation.
- **Réussi si** : le carton est créé, placé, et contient au moins un objet.
- **À observer** : comprend-il qu'un carton se pose sur un rangement ?
  Comprend-il que les objets qu'il y met changent de localisation ?

### T6 — Question de perception (sans manipulation)
*À poser en montrant la fiche d'un vêtement.*

> « Selon toi, qui peut voir ce vêtement en ce moment ? »

- **Réponse attendue** : personne, tant qu'il n'a pas été partagé.
- Si le participant répond « mes amis » ou « tout le monde », **le principe
  n° 1 n'est pas passé** — c'est le résultat le plus important du test.

---

## 6. Questions de fin

À poser dans cet ordre, sans commenter les réponses :

1. En une phrase, à quoi sert cette application ?
2. Qu'est-ce qui t'a paru le plus simple ? Le plus pénible ?
3. Y a-t-il eu un moment où tu ne savais plus où tu étais ?
4. Est-ce qu'il y a quelque chose que tu pensais trouver et que tu n'as pas
   trouvé ?
5. Est-ce que tu l'utiliserais ? Pour quoi, concrètement ?
6. Sur 10, à quel point ça t'a paru simple ? (le chiffre ne vaut rien seul,
   c'est ce qu'il dit après qui compte)

---

## 7. Grille d'observation — une par participant

**Participant** : P__  ·  **Date** : __/__/____  ·  **Support** : téléphone / ordinateur

| Tâche | Réussite | Hésitations (>5 s) | Retours arrière | Relance nécessaire | Verbatim marquant |
|---|---|---|---|---|---|
| T1 Faire entrer une chose | ☐ seul ☐ avec relance ☐ échec | | | ☐ | |
| T2 Retrouver une chose | ☐ seul ☐ avec relance ☐ échec | | | ☐ | |
| T3 Prêter et suivre | ☐ seul ☐ avec relance ☐ échec | | | ☐ | |
| T4 S'habiller | ☐ seul ☐ avec relance ☐ échec | | | ☐ | |
| T5 Ranger en vrac | ☐ seul ☐ avec relance ☐ échec | | | ☐ | |
| T6 Qui peut voir ? | ☐ personne ☐ mes amis ☐ tout le monde ☐ ne sait pas | — | — | — | |

**Écarts de vocabulaire** — les mots employés par le participant là où
l'interface en emploie un autre (ex. « boîte » pour *carton*, « armoire »
pour *rangement*, « emprunter » pour *prêter*) :

| Ce qu'il dit | Ce que dit l'interface | Où |
|---|---|---|
| | | |

**Notes libres** :

---

## 8. Dépouillement

**Classer chaque problème observé** sur trois niveaux :

- **Bloquant** — la tâche échoue, ou le participant fait le contraire de ce
  qu'il croit faire.
- **Gênant** — la tâche réussit, mais avec hésitation, détour ou doute
  exprimé.
- **Cosmétique** — remarque sur la forme, sans effet sur la réussite.

**Règle de décision** : un problème rencontré par **deux participants ou
plus** est à corriger avant de continuer le projet. Vu une seule fois, il
est noté et laissé en attente — sauf s'il est bloquant, auquel cas une
seule occurrence suffit.

**Tableau de synthèse à remplir après les cinq séances :**

| Problème observé | Écran | P1 | P2 | P3 | P4 | P5 | Gravité | Correction décidée |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

**Sortie du test** : la liste des corrections décidées, chacune devenant
une tâche dans la section « 17 — UX / UI » d'Asana. C'est cette liste qui
permet de cocher « Tester la simplicité des parcours ».

---

## 9. Ce que ce test ne dira pas

À dire dans le rapport, plutôt que de le laisser deviner :

- **Rien de statistique.** Cinq personnes détectent des problèmes, elles ne
  mesurent pas une satisfaction ni ne comparent deux versions.
- **Rien sur la durée.** Un prototype cliquable ne dit pas si l'application
  est encore utile au bout de trois mois, ni si les gens prennent la peine
  de saisir 128 objets.
- **Rien sur les temps.** Les chemins du prototype sont plus courts que le
  produit réel : chronométrer n'aurait pas de sens.
- **Un biais d'observateur.** Le participant sait qu'on le regarde et
  cherche à bien faire. D'où la consigne d'accueil, qui ne le supprime pas
  mais l'atténue.

---

## 10. Mener la passation, concrètement

### A. Préparer le prototype — la veille, pas le jour même

1. **Partager le fichier en lecture** : *Share* → « Toute personne disposant
   du lien » → *can view*. Sans ça, le participant doit se créer un compte
   Figma pour ouvrir le lien, et la séance commence par cinq minutes
   d'inscription.
2. **Un lien par tâche.** En mode Présentation, le sélecteur en haut à
   gauche liste les 19 flows. Choisis le flow de la tâche, copie l'URL :
   elle démarre sur le bon écran. Prépare les cinq liens à l'avance, dans
   une note. Sans ça tu cherches l'écran de départ devant le participant.
3. **Désactive « Show hotspot hints on click ».** C'est le réglage le plus
   important de toute la passation. Par défaut, un clic dans le vide fait
   clignoter en bleu **toutes** les zones cliquables de l'écran : le
   participant a la réponse sans chercher, et la tâche ne mesure plus
   rien. Le réglage est dans les options du lecteur (l'icône en haut à
   droite en mode Présentation).
4. **Règle l'appareil sur un téléphone** et l'affichage sur « Ajuster à
   l'écran », puis passe en plein écran.
5. **Fais les cinq tâches toi-même**, une fois, la veille. Tu vérifies que
   chaque chemin va au bout et tu sais où sont les impasses.

### B. Le support

- **Le mieux** : le participant sur son propre téléphone, avec le lien.
  C'est son pouce, sa taille d'écran, ses habitudes.
- **Acceptable** : ton téléphone, que tu lui tends.
- **À distance** : en visio, tu partages l'écran et il te dit où cliquer.
  Ça marche, mais tu perds les hésitations de la main — note-le dans le
  compte rendu.

### C. Recruter

Cinq personnes hors projet, ni designers ni développeurs. **Prends six
rendez-vous** : il y a toujours un désistement. Trente minutes annoncées,
trente-cinq en vrai. Des camarades d'une autre filière, de la famille, des
colocataires : à ce stade, la diversité de profils compte moins que le
fait qu'ils découvrent l'interface.

### D. Le jour J, minute par minute

| Temps | Ce que tu fais |
|---|---|
| −5 min | Prototype ouvert sur la tâche 1, hotspot hints désactivés, grille prête, chrono à zéro |
| 0–3 | Accueil et consigne (le texte du §4, à dire en entier) |
| 3–5 | Accord pour l'enregistrement, première impression de l'écran d'accueil sans rien toucher |
| 5–25 | Les cinq tâches, une par une |
| 25–28 | La question de perception (T6) |
| 28–35 | Les questions de fin |

### E. Ce qui ruine un test

- **Guider.** « Tu as vu le bouton en bas ? » — la séance est finie, tu ne
  mesures plus rien. Compte une minute de blocage complet avant toute
  relance, et note-la.
- **Expliquer.** Si on te demande « ça sert à quoi ? », renvoie la
  question : « à ton avis ? ». La réponse est une donnée.
- **Réagir.** Un « ah oui, c'est un bug » ou un soupir apprend au
  participant à te faire plaisir. Visage neutre, même quand ça part mal.
- **Poser des questions fermées.** « C'était clair ? » appelle « oui ».
  Demande plutôt « qu'est-ce que tu t'attendais à trouver ? ».
- **Tester avec quelqu'un qui connaît le projet.** Il ne découvre rien, il
  te confirme.
- **Enchaîner sans noter.** Au troisième participant, tu ne sais plus qui
  a dit quoi.

### F. Juste après chaque séance — cinq minutes, sans exception

Relis ta grille pendant que c'est frais, complète les verbatims que tu as
notés en abrégé, et écris **la phrase la plus marquante** de la séance.
C'est ce qui reste utile trois semaines plus tard, quand tu rédiges.

### G. Budget

Une demi-journée pour les cinq séances si elles s'enchaînent, deux heures
pour le dépouillement. Le tableau de synthèse du §8 se remplit à la fin,
pas au fil de l'eau : c'est en comparant les cinq grilles qu'on voit ce
qui est un vrai problème et ce qui est une habitude personnelle.

