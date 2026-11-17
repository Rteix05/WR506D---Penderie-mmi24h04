# Journal d'utilisation de l'IA — Penderie

Ce journal trace l'usage de l'IA dans le projet, à deux niveaux :

1. **L'IA comme outil de développement** : Claude Code (modèle Claude d'Anthropic), utilisé dans le terminal sur le dépôt. Pour chaque séance, le journal donne la demande (le prompt, mot pour mot quand il est conservé), ce que l'IA a produit, ce qui a été vérifié ou corrigé, et les PR qui en sont sorties.
2. **L'IA dans le produit** : les modèles de vision appelés par l'API (scan d'un objet, lecture d'une étiquette, look du jour). Pour ces appels, le journal donne le modèle, la consigne (le prompt) et la manière dont la réponse est contrôlée.

Règles suivies avec l'outil de développement :

- **Une PR par sujet**, et jamais l'API et l'app dans la même branche.
- **Tout passe par une PR relue et mergée par l'étudiant**. L'IA n'écrit jamais directement dans `develop`.
- **L'IA vérifie avant de livrer** : tests PHPUnit côté API ; `tsc`, `expo lint` et export web côté app. Le journal signale ce qui n'a pas pu être vérifié (tests sur téléphone).
- **Les écrans sont comparés à la maquette Figma avant d'être codés.** Les écarts sont écrits dans la PR.
- **Pas de modèle payant dans le produit** : uniquement des modèles gratuits (`:free`) d'OpenRouter.

---

## L'IA dans le produit

### Scan d'un objet ou d'un vêtement, lecture d'une étiquette

- **Où** : `api/src/Service/Scan/ScanAnalyzer.php` (consigne) et `OpenRouterVision.php` (appel).
- **Modèles** : la chaîne `OPENROUTER_SCAN_MODELS`, que des modèles gratuits.
  - Choix du 05/10 : 2 Gemma, un Qwen, un Nemotron.
  - Le 06/10, le Qwen est devenu payant et a été remplacé par `dots-3-note-preview:free`.
  - Les modèles sont essayés dans l'ordre. On passe au suivant si le modèle répond « quota dépassé » (429), s'il a été retiré (404), s'il est en panne, s'il met plus de 30 s ou s'il ne renvoie pas de JSON.
- **Consigne (photo)**, résumée :
  - « Identifie l'objet principal de la photo. S'il se porte, type = GARMENT ; sinon ITEM » ;
  - le modèle répond uniquement en JSON (nom, description, catégorie, marque, couleurs, taille, composition, entretien, pays, confiance) ;
  - il doit choisir la catégorie et les couleurs dans **nos** listes de slugs et de couleurs, fournies dans la consigne ;
  - « N'invente rien : une information absente vaut null ».
- **Consigne (étiquette)** : « Recopie ce qui est écrit sur l'étiquette cousue : marque, taille, composition, entretien en mots, pays. »
- **Contrôle de la réponse** :
  - seules les valeurs du bon type sont gardées ;
  - une catégorie ou une couleur hors de nos listes est écartée ;
  - une marque inconnue reste en texte, et l'app propose de la créer ;
  - chaque scan, réussi ou non, est tracé dans la table `scan` (modèle qui a répondu, échecs des précédents) pour mesurer la fiabilité.

### Look du jour (12/10)

- **Où** : `api/src/Service/Dressing/LookTagDetector.php`. Même chaîne de modèles gratuits que le scan.
- **Ce que reçoit le modèle** :
  - un gros plan découpé par l'app autour du point que l'utilisateur a posé sur sa photo ;
  - la liste numérotée de ses vêtements (80 au plus) : nom, catégorie, couleurs, marque.
- **Consigne** (extrait) :

  > La photo est un gros plan découpé dans une photo de tenue : le vêtement, la chaussure ou l'accessoire porté AU CENTRE de l'image est celui à identifier. Ignore le reste.
  > Voici les vêtements déjà enregistrés dans son dressing, numérotés : […]
  > Si le vêtement du centre est l'un d'eux (même type, mêmes couleurs, même marque si visible), réponds avec son numéro dans "match". Dans le doute, ne choisis pas : match = null.
  > Si match = null, décris le vêtement pour pouvoir l'ajouter au dressing.
  > Réponds UNIQUEMENT avec un objet JSON […] N'invente rien.

- **Contrôle de la réponse** :
  - un numéro hors de la liste est ignoré, et le point est alors traité comme un vêtement nouveau ;
  - la description d'un vêtement nouveau passe par la même normalisation que le scan ;
  - l'utilisateur confirme ou corrige toujours le résultat : rien n'est lié à un vêtement sans son accord.
- **Limite connue** : le modèle ne voit pas les photos du dressing, seulement leur description. Les modèles gratuits refusent plusieurs images dans une même requête.

---

## Séances avec l'outil de développement

> Les séances d'avant le 12/10 sont reconstituées à partir des notes de suivi (les prompts n'avaient pas été conservés mot pour mot). Depuis le 12/10, les prompts sont recopiés tels quels.

### 05 et 06/10 — Scan par IA

- **Demande** (résumée) : brancher le scan sur une IA, Gemma en priorité, uniquement des modèles gratuits, avec au moins 4 modèles de secours.
- **Produit** :
  - l'appel OpenRouter avec la chaîne de modèles ;
  - les consignes photo et étiquette ;
  - la trace des scans ;
  - un faux OpenRouter pour les tests (le premier modèle répond toujours « quota dépassé », pour tester les modèles de secours).
- **Corrigé en cours de route** : un modèle est devenu payant ; les modèles `inkling:free` répondent 403 en dehors de leur environnement. La liste a été ajustée à partir du catalogue réel d'OpenRouter.
- **Vérifié** : premier scan réussi depuis l'iPhone (une veste Stone Island reconnue).

### 09/10 — App : connexion, navigation, parcours d'ajout (PR #24 à #27)

- **Demande** (résumée) : commencer l'app par la connexion et la navigation, puis le parcours d'ajout, en suivant la maquette Figma.
- **Produit** :
  - écrans de connexion et d'inscription ;
  - les 4 onglets et le bouton « + » ;
  - l'accueil ;
  - le parcours d'ajout d'un objet ou d'un vêtement (13 écrans), avec le scan qui pré-remplit les champs ;
  - l'envoi des photos.
- **Corrigé** : l'étudiant a signalé que la maquette n'avait pas été respectée. Depuis, chaque écran est comparé à Figma avant d'être codé.

### 10/10 — Titres coupés sur iOS, inventaire (PR #28, #29)

- **Produit** :
  - correction de la police Typolio, dont les titres étaient coupés sur iOS ;
  - Mes objets et Mon dressing (recherche, filtres, tri), les fiches, la modification et la suppression.
- **Signalé** : un objet supprimé reste lisible par son adresse directe (écart de l'API, noté dans la PR).

### 12/10 — Création de marque, merges (PR #30, #31)

- **Demande** : « merge les PR dans l'ordre ».
- **Produit** : l'ajout d'une marque absente de la liste, depuis le scan ou à la main ; merges de #29, #30 et #31 dans l'ordre.

### 12/10 — Onglet Logements (PR #32)

- **Prompts** :
  - « t'as fais l'inventaire et les logements ? »
  - « fais ca »
- **Produit** :
  - l'onglet Logements, d'après la section Figma « 04 · Logements & rangements » : logements, pièces, rangements, cartons, fiche d'un carton ;
  - la création d'un logement en 4 étapes et d'un carton en 3 étapes ;
  - la suppression d'un emplacement vide.
- **Vérifié** : chaque appel à l'API rejoué avec un compte de test (création puis suppression des 4 niveaux).
- **Signalé** : l'API n'envoie jamais l'état « carton fermé » (écart noté dans la PR). L'app n'a pas été testée sur téléphone.

### 12/10 — Réseau de l'école

- **Prompts** :
  - « je suis sur eduroam pour la connection »
  - « c'est bon je suis sur le partage de co »
- **Produit** : diagnostic. Eduroam isole les appareils entre eux ; l'adresse de l'API passe à celle du partage de connexion (`172.20.10.2`). Windows bloquait les connexions entrantes parce que le réseau était classé « Public » : l'IA a donné la commande pour le passer en « Privé », sans modifier elle-même ce réglage de sécurité.

### 12/10 — Look du jour (PR #33 API, #34 app)

- **Prompt** :

  > pour le look du jour , il faut qu'on puisse prendre une photo de soi , puis depuis la photo placer des point sur chaque vetement (eventuellement en JS) puis que l'IA du scan fasse un la détection des vetements (soi depuis nos vetements enregistré sur Penderie , sinon detecte un nouveau vetement , puis on doit pouvoir faire un post qui se postera en 2 slides sur Instagram ( ne gère pas le post on le fera en cours , gère juste juste l'état de look du jour

- **Analyse de l'IA avant de coder** :
  - aucun écran Figma n'existe pour cette fonctionnalité ;
  - les tenues (`Outfit`) existent dans la base mais ne sont pas exposées par l'API ;
  - le conteneur PHP n'a pas de bibliothèque d'image. Décision : **le téléphone découpe le gros plan** autour de chaque point (`expo-image-manipulator`, déjà installé), et l'API ne fait que l'analyser.
- **Produit (API, #33)** :
  - entités `DailyLook` (un look par jour) et `LookTag` (un point) ;
  - les états `TAGGING › READY › POSTED` ;
  - les routes `/api/looks` ;
  - la détection par l'IA, qui reconnaît un vêtement du dressing ou décrit un vêtement nouveau ;
  - le port noté (`WearLog`) quand le look est prêt ;
  - 7 tests ; suite complète à 203 tests OK.
- **Produit (app, #34)** :
  - la carte « Look du jour » de l'accueil ;
  - la prise de photo ;
  - la pose des points sur la photo ;
  - le choix d'un vêtement du dressing ;
  - l'ajout d'un vêtement nouveau, pré-rempli par l'IA, avec le gros plan comme photo ;
  - l'aperçu du post en 2 images (la photo avec ses points, puis la liste des vêtements) et « Marquer comme posté ».
- **Corrigé pendant la séance** :
  - la base de test n'avait pas la nouvelle migration ;
  - les erreurs métier (point hors de la photo, look déjà posté) sortaient en erreur 500 au lieu de 422 ;
  - la suppression d'un look plantait parce que la photo était effacée avant que son chemin soit lu ;
  - une règle du lint React (mise à jour d'état dans un effet) a imposé de réécrire l'écran de transition vers l'ajout.
- **Pas vérifié** : l'appareil photo et le découpage sur iPhone.

- **Autres prompts de la séance** :
  - « quand t'as fini ca lance la fonctionnalité du multi-compte » (à faire ensuite) ;
  - « pense a tenir le ASANA à jour et à remplir le journal d'utilisation de l'IA avec les prompts etc ». Ce journal a été créé à cette occasion, et 18 tâches Asana déjà livrées ont été cochées ;
  - « petite erreur UX qu'il faudra corriger après ; quand on ajoute des baskets c'est les tailles vetements qui sont proposé au lieu des pointures » (à corriger ensuite).

### 12/10 — Pointures des chaussures (PR #36)

- **Prompt** :

  > petite erreur UX qu'il faudra corriger après ; quand on ajoute des baskets c'est les tailles vetements qui sont proposé au lieu des pointures

- **Cause trouvée par l'IA** : l'échelle de tailles venait du « type » choisi à la première étape. Un vêtement reconnu par le scan saute cette étape, et l'app retombait alors sur les tailles en lettres.
- **Correction** : l'échelle vient maintenant de la catégorie, qui porte la sienne côté API. Le champ s'intitule « Pointure » pour des chaussures.
- **Vérifié** : `tsc` et lint. Pas testé sur téléphone.

### 12/10 — Profils du compte, « multi-compte » (PR #37 API, #38 app)

- **Prompts** :
  - « quand t'as fini ca lance la fonctionnalité du multi-compte »
  - Précision demandée par l'IA, réponse de l'étudiant : « le système de compte qu'on a établi dans le mdd avec les sous comptes , les comptes adultes qui sont aussi géré par nous etc ». Périmètre choisi : profils et autorisations ; le code parent et les demandes de l'enfant viendront plus tard.
- **Analyse de l'IA avant de coder** :
  - le MDD et les entités existaient déjà : `Profile` (ADULT, CHILD, RELATIVE), la tutelle, `ProfilePermission`, la politique par défaut, le voter ;
  - l'API n'exposait que la liste des profils et la suppression d'un enfant ;
  - les 5 écrans Figma de la section « Compte » ont été comparés au MDD. Écart retenu : la maquette montre des interrupteurs, mais le MDD a trois modes (autorisé, avec accord, interdit), et l'app les propose tous les trois.
- **Produit (API, #37)** :
  - `/api/account/profiles` : liste, création d'un enfant ou d'un proche, modification, lecture et réglage des autorisations ;
  - la suppression d'un proche suit la même procédure que celle d'un enfant ;
  - 7 tests ; suite complète à 203 tests OK.
- **Produit (app, #38)** : Changer de profil, fiche d'un profil, Nouveau profil, Modifier, Autorisations, et le nouvel écran « Mon profil ».
- **Pas vérifié** : les écrans sur téléphone.

### 12/10 — Conflits de merge, suivi Asana, réseau (PR #32 à #38)

- **Prompts** :
  - « tout est testable sur l'app ? » : l'IA a répondu que non, les PR #32 à #38 n'étant pas mergées, et a listé ce qui l'était déjà ;
  - « j'ai merge 33 et 34 a un conflit , regle le conflit puis fais les merge » ;
  - « c'est mergé, coche Asana et remplis le journal + regarde l'ip du partage de co ».
- **Conflits résolus par l'IA**, tous en gardant les deux côtés :
  - #34 contre l'onglet Logements (#32) : la liste des écrans de l'app (`_layout.tsx`) et le README ;
  - #37 contre le look du jour (#33) : la liste des routes dans `ControllerErrorSubscriber` (les deux préfixes gardés). Suite API complète après fusion : 210 tests OK ;
  - #38 : résolue d'avance contre la branche de #34, pour qu'elle se merge sans conflit après elle.
- **Merges** : l'IA a voulu lancer `gh pr merge`, mais les permissions de la session l'ont bloqué ; l'étudiant merge lui-même.
- **Asana** : 13 tâches couvertes par l'onglet Logements (#32) cochées (logements, pièces, rangements, cartons). Aucune tâche Asana ne correspond au look du jour.
- **Réseau** : sur le partage de connexion de l'iPhone, le PC est en `172.20.10.2` (déjà dans `app/.env.local`). Le profil Wi-Fi est resté « Public » sous Windows, ce qui bloque le téléphone ; l'étudiant doit le passer en « Privé » lui-même (droits administrateur).

### 12/10 — Merges, données de test, présentation orale

- **Prompts** :
  - « comment je pourrais montrer mon écran iPhone depuis l'ordi pour les présentations orals » : l'IA a comparé câble HDMI direct, carte d'acquisition HDMI vers le PC, et AirPlay (déconseillé sur eduroam), et conseillé une vidéo de secours ;
  - « créer des sous comptes au compte scantest pour que je vois comment ca rend , fais des fausses données pour toute les fonctionnalités sauf des objets , comme ca je testerai moi meme » ;
  - « ou sont les sous comptes ? », « comment je crée le look du jour depuis l'accueil ».
- **Données de test**, en local, sur le compte scantest : 4 profils (2 enfants, 1 proche, 1 second adulte) avec des autorisations variées, 3 logements avec pièces, rangements et cartons, et 31 vêtements. Ni objet ni look, à la demande de l'étudiant. Les profils sont créés en base ; le reste passe par l'API, avec un script, pour respecter ses règles. Un jean a d'abord été refusé (sa taille doit être en W/L) puis recréé.
- **Asana** : après les merges, 6 tâches « Comptes & profils » cochées.

### 13/10 — Erreur JSON sur un point du look, fil d'actualité (PR #39 à #42)

- **Prompt** :

  > j'ai des erreurs json quand je place un point à certains moment (JSON Parse error: unexpected character: <) et aussi le post doit aussi apparaitre dans le feed de Penderie ducoup en + de Instagram (qu'on ajoutera plus tard) et le point sur le post doit agir comme une mention instagram (quand on clique on voit le titre de la pièce et si l'objet est publique on doit pouvoir le voir sur le compte de la personne

- **Diagnostic de l'erreur** : l'IA a lu les journaux de l'API et y a trouvé « Maximum execution time of 30 seconds exceeded ». La chaîne de 4 modèles gratuits avait 30 s par modèle, autant que la limite de PHP pour toute la requête : PHP coupait la requête et renvoyait une page HTML, que l'app lisait comme du JSON.
- **Corrections** :
  - #39 (API) : un budget de 24 s commun à toute la chaîne de modèles. Quand il est épuisé, le point est « pas reconnu » au lieu de faire planter la requête. Un test ajouté ;
  - #40 (app) : un message lisible si l'API répond autre chose que du JSON.
- **Questions de l'IA avant de coder le fil**, réponses de l'étudiant (toutes les options recommandées) :
  - périmètre : le fil et le look publié avec ses mentions ; commentaires et signalement plus tard ;
  - un vêtement « public » est celui que la publication partage ;
  - audience au choix, amis ou abonnés ;
  - une page de profil simple.
- **Analyse** : le MDD prévoyait déjà qu'une publication porte le partage de la ressource qu'elle met en avant. L'IA a donc fait du look une tenue (`Outfit`) partagée par la publication, et les droits existants rendent ses vêtements lisibles par l'audience, sans nouvelle règle.
- **Produit** :
  - #41 (API) : publier un look, le fil, une publication, la page d'un profil ; 4 tests, suite à 214 OK ;
  - #42 (app) : le fil (d'après les écrans Figma du lot 16), « Publier dans Penderie », les points-mentions, la page d'un profil.
- **Erreur de l'IA corrigée** : la description de la PR #39 contenait la signature « Generated with Claude Code », contraire à la consigne de l'étudiant (aucune attribution). L'IA l'a retirée aussitôt.
- **Pas vérifié** : les écrans du fil sur téléphone.

### 13/10 — Le look du jour reste sur le vêtement du point (PR #44, #45)

- **Prompt** :

  > Scan look du jour, faudrait que l'IA essaye de délimiter le vetement ou on a placer le point pour qu'elle reste bien sur le vetement placé

- **Analyse de l'IA** : le gros plan montre souvent plusieurs vêtements, et la consigne parlait seulement du « vêtement au centre ». Près d'un bord de la photo, le gros plan est décalé, donc le point n'y est même plus au centre.
- **Produit** :
  - l'app envoie où elle a découpé le gros plan ;
  - la consigne donne la position exacte du point et demande de délimiter **seulement** le vêtement dessous (rectangle `box`) ;
  - si ce rectangle ne contient pas le point, la réponse est écartée (« L'IA a regardé à côté du point ») plutôt que de proposer le mauvais vêtement ;
  - l'app dessine le contour en pointillés autour du point ;
  - les rectangles en pourcentages ou sur 1 000 sont aussi acceptés.
- **Tests** : 2 tests d'API et 1 test unitaire ajoutés. Pendant les essais, l'IA a repéré un « Invalid JWT Token » intermittent dans la suite de tests. Elle a vérifié qu'il existait déjà sur develop, puis l'a signalé à part sans le corriger.
- **Conflit** : #45 et #42 modifient le même composant photo ; résolu en gardant les deux (points cliquables et contours).
- **Pas vérifié** : la précision des contours avec les vrais modèles gratuits, sur téléphone.

### 13/10 — Réseau, look du jour sans IA, tests instables, fil peuplé (PR #46 à #49)

- **Prompts** :
  - « check l'ip j'ai mis partage de co », « ca bug , recheck l'ip », « ca time out encore » ;
  - « le scan look du jour renvoi toujours des erreur json , faudrait au lieu que l'IA scan le vetement , juste on l'identifie depuis nos vetements , et si c'est un vetement qui et pas du dressing on lui met un titre seulement pour le look , puis sa créer un objet/vetement incomplet a terminer nous meme plus tard » ;
  - « le scan de code barre / étiquette fonctionne ? » ;
  - « pense a intégrer les maquettes pour le fil d'actualité pour que je test ».
- **Réseau** :
  - le conteneur PHP de l'API s'était arrêté (« zend_mm_heap corrupted ») ; l'IA l'a redémarré ;
  - le pare-feu de Windows n'autorisait Docker et Node que sur un réseau **Public**. Le conseil donné plus tôt par l'IA, passer le Wi-Fi en Privé, était donc faux : il bloquait le téléphone. L'IA l'a reconnu et a donné les deux corrections possibles, que l'étudiant applique lui-même.
- **Scan** :
  - le code-barres n'est pas fait dans l'app (le mode existe seulement dans le modèle de données) ;
  - l'étiquette échouait pour deux raisons : la limite de 30 s de PHP (corrigée par #39) et les 4 modèles gratuits saturés ce jour-là (429, quotas dépassés).
- **Look du jour sans IA** (#46 API, #48 app). Questions posées par l'IA, réponses de l'étudiant : « titre seul » et « IA retirée du look ».
  - Toucher la photo ouvre « Quel vêtement ? » : un vêtement du dressing, ou un titre.
  - Le titre crée un vêtement « à compléter », sans catégorie ni pièce : seule exception à la règle du modèle, la création par l'API restant stricte.
  - « Compléter » donne ensuite la catégorie et l'emplacement (nouvelle route `POST /api/garments/{id}/complete`).
  - Le contour délimité par l'IA (#44, #45, mergés entre-temps) est retiré, avec sa colonne en base.
- **Tests instables trouvés et corrigés** :
  - un 401 « Invalid JWT Token » au hasard : l'horloge du conteneur Docker (WSL2) recule parfois de quelques millisecondes. La tolérance `clock_skew: 5` le règle (#47) : 3 lancements sur 3 verts, contre 1 à 2 échecs par lancement sans ;
  - trois tests qui échouaient sans défaut dans le code (#49) : le budget de l'IA sur une machine chargée ; un « secret » (350) retrouvé dans un UUID v7, dont le début est l'heure courante ; l'ordre de deux UUID créés dans la même milliseconde.
- **Erreurs de l'IA, corrigées** :
  - un remplacement automatique (sed) a abîmé une ligne de test, poussée telle quelle sur la branche de #39 ; l'IA l'a vue au lancement suivant et corrigée ;
  - une correction poussée sur #41 et #39 juste après leur merge n'est pas entrée dans develop ; elle a été reportée dans #46 et #49.
- **Fil d'actualité, comme la maquette** :
  - trois comptes de démonstration (Thomas et Camille, amis de scantest ; Julie, suivie) ont chacun un dressing et un look publié (« il y a 2 h », « hier », « il y a 2 j ») ;
  - les photos sont des silhouettes générées par un script, aux couleurs des vêtements pointés ;
  - tout passe par l'API.
- **Vérifié** : sur une branche locale réunissant toutes les PR ouvertes, 216 tests verts sur deux lancements, et `tsc` et lint de l'app. **Pas encore testé sur téléphone.**

### 13/10 — Séance 15 : qualité du code, CI (PR #51 à #53)

- **Prompt** : le sujet de la séance collé tel quel (PHPStan niveau 6, Makefile, Snyk, linter Symfony, Composer audit, inspections manuelle et visuelle, A11Y, écoconception, UX, testabilité, livrable `audit.md`), avec « fais ça en attendant, c'est pour les tests CI/CD sur git ».
- **Produit** :
  - PHPStan niveau 6 avec les extensions Symfony, Doctrine et PHPUnit, sur `src/` et `tests/` : **de 163 erreurs à 0**. Une seule règle est ignorée, avec sa justification (héritage à table unique) ;
  - un Makefile ;
  - des jobs CI « Qualité » et « Sécurité (Snyk) » côté API, un workflow pour l'app (ESLint, TypeScript, audit npm) ;
  - `audit.md`.
- **Choix de l'IA** :
  - corriger plutôt qu'ignorer. 86 erreurs venaient d'un seul trait (dates nullables) : propriétés non nulles, mais des getters qui renvoient toujours `null` avant l'enregistrement, parce qu'un validateur s'en sert ;
  - pour les tests, un type partagé `TestUser` plutôt que des centaines de `array<string, mixed>` ;
  - les ratios de contraste de l'audit sont calculés avec la formule WCAG sur le vrai fond de l'app. Une première estimation (4,9:1) était fausse : c'est 4,85:1 sur le fond, et 5,08:1 sur blanc.
- **Erreurs de l'IA, corrigées** :
  - `npm audit fix --omit=dev` a retiré ESLint de `node_modules` (dont dépend aussi le serveur Expo du poste). L'IA l'a vu au lancement suivant, a tout réinstallé, puis a vérifié le bundle iOS complet ;
  - des remplacements `sed` avec des barres obliques inverses ont échoué plusieurs fois (Git Bash) : l'IA est passée aux éditions directes.
- **Vérifié** :
  - `make quality` dans le conteneur ;
  - 216 tests ;
  - les checks GitHub tous verts sur les PR (tests, qualité, Snyk sauté sans jeton, ESLint et TypeScript).

### 13/10 — Export web et Lighthouse (PR #54, #55)

- **Prompt** : « corrige l'export web pour lancer lighthouse ».
- **Diagnostic de l'IA** :
  - l'erreur venait du pré-rendu d'expo-router (`Platform` indéfini côté serveur), pas du code de l'app ;
  - l'IA a refait l'export sur une copie à part du dépôt, avec l'ancien fichier de verrou : il passait. C'est donc **la mise à jour des dépendances qu'elle avait faite dans #52** qui l'avait cassé, par une régression d'Expo 57.0.28.
- **Correction** :
  - export web en une seule page, plutôt que revenir sur la mise à jour (qui corrige une faille critique) ;
  - écrans chargés à la demande sur le web (fichier initial de 2,5 → 1,1 Mo, bundle natif inchangé) ;
  - page en français avec une description ; `robots.txt`.
- **Lighthouse** :
  - mobile 50 / 100 / 100 / 100 (performance, accessibilité, bonnes pratiques, SEO ; SEO à 83 avant) ;
  - ordinateur 98 / 100 / 100 / 100.
  - Rapports dans `docs/lighthouse/`, résultats repris dans `audit.md`.

### 14/10 — Séance 16 : fixtures, campagne de tests, Cypress, Makefile (branche feat/test)

- **Prompts** (mot pour mot) :
  - « on a déja des fixtures pour tester non ? » (réponse de l'IA : non, chaque test crée ses données ; rien pour remplir une base de démonstration) ;
  - le sujet de la séance collé tel quel (fixtures, campagne de test sur le métier à 100 %, `coverage.md`, Cypress en local, démonstration, Makefile, captures, `ci.md`), avec « fais les fixtures + suit cette démarche, et si tu estimes que la tache est faisable par les sous agents tu peut, à condition que tu vérifies dèrrière ce qu'ils ont fait » ;
  - en cours de route : « tout doit etre sur une branche feat/test ».
- **Produit** (détail : `docs/coverage.md`, `docs/ci.md`) :
  - fixtures Doctrine (Camille, Thomas, Julie, Nina) chargées dans une base à part (`penderie_e2e`, API sur le port 8090), plus un test qui valide chaque entité du jeu ;
  - tests PHPUnit : de 216 à 279 tests ; code métier couvert à 100 % (1 656 lignes), 87,6 % sur tout `src/` (82,3 % au départ) ; contrôle `bin/coverage-check`, exigé en CI ;
  - 11 scénarios Cypress sur l'export web de l'app ;
  - un Makefile à la racine ; des captures générées depuis les vraies sorties des commandes.
- **Choix de l'IA** :
  - « métier » = les dossiers des règles (services, droits, validateurs…) plus les méthodes d'entités qui décident (complexité ≥ 2), pas les accesseurs ni les contrôleurs ;
  - tester les refus avec leur message exact, par les vrais gestes, jamais par réflexion sur une méthode privée ;
  - supprimer le code mort plutôt que le tester (2 méthodes) ;
  - Cypress cible l'app par ses étiquettes d'accessibilité, sans identifiant de test.
- **Trouvé par les tests, corrigé** :
  - sur le web, aucun état accessible (coché, sélectionné, désactivé) n'atteignait le lecteur d'écran : `accessibilityState` remplacé par les props `aria-*` dans 12 composants ;
  - l'app web ne démarrait plus (Expo 57.0.28) : la PR #54 a été fusionnée dans la branche ;
  - l'API de test mettait 15 à 30 s par requête en mode debug sous Windows : la passer en `APP_DEBUG=0` ramène ce temps à 0,5-3 s.
- **Sous-agents (OpenCode, gratuit)** : deux lots de tests d'entités leur ont été délégués. Verdict : **refusés**.
  - Les tests ne s'exécutaient pas : imports inexistants, constructeurs faux, appels de méthodes privées par réflexion, un lot incomplet.
  - Un agent a lancé `docker compose` depuis sa copie du dépôt, ce qui a recréé les conteneurs de développement de l'étudiant sur cette copie. L'IA a arrêté les agents, remis les conteneurs sur le vrai dossier, vérifié que les données étaient intactes, puis réécrit les tests elle-même.
- **Erreurs de l'IA, corrigées** :
  - un commit a embarqué par erreur `package.json` et `tsconfig.json` ; il a été refait avant tout push ;
  - un message de commit annonçait 280 tests au lieu de 279 ; il a été corrigé avant le push ;
  - plusieurs remplacements `sed` ont de nouveau échoué sous Git Bash ; l'IA est repassée aux éditions directes.
- **Vérifié** :
  - `make coverage` : 279 tests verts, 100 % métier ;
  - `make quality` : 0 erreur ;
  - `make e2e` : 11 sur 11, sur plusieurs campagnes de suite, avec remise à zéro de la base.

### 15/10 — Séance 16 (suite) : vérification contre le cours, revert, sélecteurs testID

- **Prompts** (mot pour mot) :
  - « https://docs.mmi-troyes.fr/books/2627-wr506d-developpement-back-avance/page/seance-16-21-tests-php-david // c'est le cours avec la méthode conseillé pour les test qu'on a fait hier , ouvre le sur chrome et vérifie que tu as bien fait ca » ;
  - « oui fais le revert et ajoute les testID ».
- **Produit** :
  - l'IA a ouvert le cours dans Chrome (connexion faite par l'étudiant) et comparé chaque consigne au dépôt. Tout était fait (fixtures, 100 % métier, `coverage.md`, unitaires/intégration/fonctionnels, Cypress, Makefile, captures, `ci.md`) **sauf une consigne** : « ne pas merge dans develop ». La PR #56 avait été fusionnée le 14/10 ;
  - **revert partiel** de la fusion sur develop : la campagne de tests (fixtures, tests, Cypress, Makefile, couverture en CI, `coverage.md`, `ci.md`, captures) ne vit plus que sur `feat/test`. Sont gardés dans develop, parce que ce sont des corrections du produit et pas des tests : le correctif d'accessibilité `aria-*` (12 composants), la suppression de 2 méthodes mortes, et ce journal ;
  - sur `feat/test` : des **`testID`** (rendus en `data-testid`) dans l'app, et une campagne Cypress qui les cible (`cy.testId(...)`), comme les `data-cy` conseillés par le cours. L'accessibilité devient une assertion sur l'élément trouvé.
- **Trouvé en route** : le scénario « refuse un mot de passe trop court » ne prouvait rien. Il cherchait « 10 caractères », texte que l'aide sous le champ affiche en permanence. Il distingue maintenant l'aide (`signup-password-hint`) de l'erreur (`signup-password-error`).
- **Erreurs de l'IA, corrigées** : un premier script de remplacement a échoué sur les fins de ligne CRLF des fichiers (rien n'a été écrit), puis un passage par le shell a cassé les guillemets. Les fichiers ont été réécrits directement.
- **Vérifié** :
  - arbre de develop après le revert : PHPUnit OK (216 tests), TypeScript et ESLint 0 erreur ;
  - `feat/test` : `make e2e` 11/11 sur deux campagnes de suite.

### 09/11 — Prêt d'objets côté API, failles Symfony (PR #58 et suivante)

- **Prompts** (mot pour mot) :
  - « ou est-ce qu'on en est dans le projet » ;
  - « on commence par le prêt d'objets , puis déplacement d'objet / carton ».
- **État des lieux fait par l'IA** : rien n'avait bougé depuis le 15/10. L'IA a croisé le dépôt et les tâches Asana non cochées. Le prêt (section 10) est la plus grosse section restante. Son modèle existait déjà (`Loan`, `LoanEvent`, la machine à états dans l'entité, l'index unique « un seul prêt actif par objet »), mais aucune route ne l'exposait.
- **Produit** :
  - `LoanController` : « Mes prêts » (`GET /api/loans`), le détail avec son journal, les candidats (amis et profils du compte), l'historique d'un objet, et un geste par transition (prêter, demander, accepter, refuser, annuler, remettre, repousser la date, déclarer le retour, confirmer le retour, déclarer perdu) ;
  - des règles en plus de l'entité :
    - on prête seulement à un ami ou à son foyer ;
    - un objet en vente ne se prête pas ;
    - un objet déjà promis ou déjà chez quelqu'un ne se promet pas à un second ;
    - on ne demande pas deux fois le même objet ;
    - la date de retour ne peut pas être passée ;
  - au retour, le prêteur constate l'état (un dommage est journalisé) et peut ranger l'objet ailleurs. Le déplacement est alors tracé avec la raison `LOAN_RETURN`, que l'enum prévoyait déjà ;
  - « Chez Bruno » sur la fiche (`lentTo`), pour le propriétaire seulement ;
  - une notification pour l'autre partie à chaque étape clé ;
  - 11 tests fonctionnels (`LoanApiTest`) et une section « Prêt d'objets » dans le README de l'API.
- **Trouvé en route** : `composer audit` échouait depuis le 4/11 (19 failles publiées sur Symfony 7.4). L'IA a ouvert une PR à part (#58) pour passer Symfony en 7.4.23 :
  - elle a refusé la montée de `doctrine/collections` en version 3, qui est une version majeure ;
  - cette mise à jour durcit `MapRequestPayload`, et 66 tests tombaient en 415 à l'inscription. L'IA a listé `json` et `jsonld` dans `RegisterController`.
- **Choix de l'IA** :
  - un enfant ne prête ni n'emprunte tant que le parcours d'accord du tuteur n'est pas exposé (la permission est « sur accord ») ;
  - les amis du prêteur n'ouvrent pas ses prêts un par un, seules les parties le peuvent.
- **Erreurs de l'IA, corrigées** :
  - un appel à `Listing::isOpen()`, une méthode qui n'existe pas (la bonne est `isOnSale()`), repéré par PHPStan ;
  - des remplacements par le shell ont encore cassé les apostrophes des chaînes PHP ; l'IA est repassée à l'éditeur ;
  - les tests attendaient « Bruno Test » alors que le nom affiché est le prénom seul.
- **Vérifié** :
  - PHPUnit, suite complète : 227 tests OK ;
  - PHPStan niveau 6 : 0 erreur ;
  - `composer audit` : aucune faille.

### 09/11 (suite) — Prêt côté app, déplacements (PR #60 à #62)

- **Prompt** : le même que l'entrée précédente (« on commence par le prêt d'objets , puis déplacement d'objet / carton »).
- **Produit** :
  - app, prêts (#60) : le parcours « Prêter » en 3 étapes (ami, date de retour et note, vérification), « Mes prêts » en deux onglets, la fiche d'un prêt avec les gestes de chaque partie et son historique, l'écran « Objet rendu ? » (état au retour, rangement), et sur les fiches « Prêter », « Demander à l'emprunter », « Chez Thomas » et l'historique des prêts. Le tout suit le lot 05 de la maquette ;
  - API, déplacements (#61) : un objet, un carton avec son contenu, un meuble avec ses conteneurs. `LocationMover` existait, il ne manquait que les routes. L'historique des emplacements quittés est aussi exposé. 6 tests ;
  - app, déplacements (#62) : un écran « Déplacer » commun (objet, vêtement, carton) qui réutilise le choix d'emplacement des parcours d'ajout, et le bloc « Emplacements précédents » sur les fiches.
- **Choix de l'IA** :
  - un conteneur ou un meuble ne se déplace que par son créateur : en colocation, on ne déménage pas les affaires des autres avec ;
  - un objet prêté peut être déplacé : c'est sa place habituelle qui change ;
  - « Demander à l'emprunter » part sans confirmation, puisque la demande se retire ensuite.
- **Vérification dans l'app** : l'extension Chrome n'étant pas connectée, l'IA a piloté l'export web avec Cypress, dans un scénario jetable hors du dépôt, contre l'API locale et le compte de démo Thomas. Elle a joué :
  - le prêt complet d'un jean à Scan (Scan reçoit et rend par l'API) ;
  - le retour, confirmé en « Usé » ;
  - le déplacement d'un sweat de la chambre à l'entrée.
- **Trouvé en testant, corrigé** :
  - `Alert.alert` ne fait rien sur le web, donc la demande d'emprunt restait muette ;
  - le bloc « Date de retour » n'affichait pas la date ;
  - « 23 nov.. » s'écrivait avec deux points.
- **Vérifié** : API 233 tests OK et PHPStan 0 erreur ; app tsc et ESLint 0 erreur.

### 09/11 (fin) — Back-office : KPI de la maquette, socle et tableau de bord (PR #63, #64)

- **Prompts** (mot pour mot) :
  - « je dois passer au back office , pour la maquette qu'on a fait sur figma le client m'a suggéré de changer les deux kpi du milieu dans le dashboard (signalement et litiges) » ;
  - « d'ailleurs le back office n'est pas dans l'appli donc on le fera en twig stimulus tailwind » ;
  - « relance » ;
  - « c'est fait à la main, pousse la branche et commence a dev » ;
  - « reprends ou tu t'étais arrété ».
- **Choix de l'étudiant** (sur proposition de l'IA) : remplacer les deux KPI par « Scans réussis » et « Prêts en cours », dans la maquette seulement d'abord.
- **Maquette (#63)** : l'IA a trouvé les deux cartes dans le fichier Figma, mais l'API Figma n'avait pas accès à la police Luciole et a refusé de modifier les textes. Rien n'a été changé dans le fichier. L'étudiant a fait la modification à la main. L'IA a mis à jour la source du plugin (lot 26), puis relu les cartes : sur « Scans réussis », le chiffre « 7 » et la majuscule de « Réussis » restent à reprendre.
- **Back-office (#64)** :
  - socle AssetMapper, Stimulus et Tailwind 4 dans l'API, avec le thème repris de la charte de l'app ;
  - pare-feu `admin` (session, formulaire, CSRF) qui refuse les comptes non administrateurs dès la connexion, et commande `app:admin:grant` ;
  - tableau de bord calculé sur les vraies données : 4 KPI, inscriptions de la semaine, priorités, dernières commandes.
- **Choix de l'IA** :
  - la branche part du correctif Symfony (#58), parce que l'audit aurait fait échouer la CI ;
  - la double authentification et les autres écrans sont reportés ;
  - « Utilisateurs actifs » compte tous les comptes, faute de date de dernière connexion. **À valider.**
- **Trouvé en route, corrigé** :
  - le nom de l'administrateur n'apparaissait pas quand son compte n'avait pas de profil « par défaut » ;
  - sans `tailwind:build`, les pages admin plantent : l'étape est ajoutée à la CI, avec `make assets`.
- **Vérifié** : 220 tests OK, `make quality` vert ; visite réelle avec Cypress (connexion refusée, tableau de bord, menu sur mobile).

### 10/11 — SDK 58, lenteur de l'API sous Windows, écrans du back-office (PR #65, #66)

- **Prompts** (mot pour mot) :
  - « je test les prets en local sur mon tel et l'admin en meme temps lance tout » ;
  - « le sdk du projet n'est plus compatible avec ma version de expo » ;
  - « timeout sur back office et tel ca c'est lancé mais très lentement » ;
  - « trouve la raison et répare ca » ;
  - « le compte admin pour le back » ;
  - « ca marche, continue les autres écrans du back office ».
- **SDK 58 (#65)** : Expo Go ne lit qu'un SDK à la fois. L'IA a lu la documentation officielle de la migration, puis passé l'app en SDK 58 (React Native 0.88). Deux adaptations : `initialRouteName` devient `anchor`, et `null` n'est plus accepté dans les listes. Vérifié : expo-doctor, tsc, ESLint, export web.
- **Lenteur** : environ 30 s par requête. L'IA a mesuré dans le conteneur : chaque fichier du code monté depuis Windows met 35 à 150 ms à être relu, et le mode debug revérifie tout `src/` à chaque requête (11 s). Une commande Symfony prend 13 s avec le mode debug, 0,3 s sans. Le contournement est `APP_DEBUG=0` dans `api/.env.local`. Il a fait apparaître un autre défaut : le CSS du back-office répondait 404 sans debug, réglé par `asset_mapper.server` en dev.
- **Écrans du back-office (#66)** : utilisateurs (liste, fiche, suspension avec journal de modération), ventes, litiges (prise en charge, décision écrite, sans mouvement d'argent comme le veut le MDD) et catégories (lecture seule). 6 tests.
- **Trouvé en essayant, corrigé** :
  - la liste des utilisateurs plantait (`DISTINCT` impossible sur une ligne qui contient du JSON) ;
  - la fiche de Thomas affichait l'identifiant de l'administrateur connecté (variable du gabarit écrasée).
- **Erreur de l'IA** : en vérifiant `api/.env.local`, elle a affiché la clé OpenRouter dans le terminal. L'étudiant a été prévenu de la régénérer.
- **Vérifié** : 226 tests OK, PHPStan 0 erreur ; visite réelle de chaque écran.

### 10/11 (suite) — Les trois points restants du back-office (PR #67 à #69)

- **Prompt** (mot pour mot) : « fais les 3 points pas encore fait ».
- **Suspension d'une durée choisie (#67)** : 7, 30 ou 90 jours, ou jusqu'à réactivation. Une suspension échue se lève toute seule à la première requête du compte, ou par la commande nocturne `app:moderation:lift-expired`, et la levée est journalisée. Pour les tests, l'horloge est simulée (`MockClock`), parce que le journal refuse une date de fin dans le passé.
- **Signalements (#68)** : l'entité `Report` du MDD (prévue en V2), la route `POST /api/reports` pour signaler depuis l'app (seulement ce qu'on voit, jamais son propre contenu), et l'écran du back-office avec quatre décisions : classer, masquer, avertir l'auteur, suspendre son compte. Chaque décision est inscrite au journal de modération et liée au signalement.
- **Double authentification (#69)** : codes TOTP (scheb/2fa-bundle), activation obligatoire à la première connexion d'un administrateur (QR code), et `--reset-2fa` si le téléphone est perdu. L'app mobile n'est pas concernée.
- **Trouvé par les tests, corrigé** :
  - une tolérance TOTP de 30 s faisait planter OTPHP ;
  - le secret généré était trop long pour sa colonne ;
  - la règle d'accès posée sur la déconnexion empêchait de se déconnecter (403) ;
  - un test des signalements, déjà poussé, ne passait pas PHPStan : corrigé sur sa branche.
- **Erreurs de l'IA** : une remise de côté (`git stash`) a échoué sur le fichier `api/nul`, au nom réservé sous Windows. Rien n'a été perdu : le travail est resté dans le dossier, et la copie en double a été supprimée après vérification. Les patchs passés par le shell ont encore abîmé des antislashs et des apostrophes ; l'IA est repassée à l'éditeur.
- **Vérifié** : 240 tests OK, PHPStan 0 erreur, migrations réversibles ; écrans vus dans le navigateur.

### 15-16/11 — Indicateurs du back-office, l'app en trois langues (PR #70, #71)

- **Prompts** (mot pour mot) :
  - « est ce que les kpi affiché dans le back-office sont les plus cohérents à montrer en priorité ? (utilisateurs actifs , scans réussis, pret en cours et vente du mois) » ;
  - « fait chaque recommendation , puis quand le back office c'est fait tu installe i8n sur le projet (l'équivalent react) et tu fais une version Anglaise et Japonaise (avec les kanji) » ;
  - « ou est-ce qu'on en est » ;
  - « faudra vérifier la mise en page avec les textes traduis notamment le japonais vu que c'est des kanji » ;
  - « le back office il manque quoi dessus ? » ;
  - « fais l'écran des marques et le bouton signaler après l'i18n , d'ailleurs il fonctionne sur le back office aussi le i18n ? » ;
  - « ouais ».
- **Indicateurs (#70)** : trois recommandations de l'IA, appliquées.
  - Une vraie mesure d'activité : `Account::lastSeenAt`, noté une fois par jour à la première requête de l'app. Les comptes existants sont estimés à partir de leurs jetons de rafraîchissement. « Utilisateurs actifs » compte maintenant les comptes venus ces 30 derniers jours.
  - « Objets ajoutés · 7 j » remplace « Ventes du mois », qui restait à 0 puisque le paiement n'est pas branché. **À valider avec le client.**
  - L'évolution par rapport à la période précédente sous chaque chiffre.
  - Vérifié : 242 tests OK, PHPStan 0 erreur, migration réversible.
- **L'app en trois langues (#71)** : i18next, react-i18next et expo-localization.
  - **Langue** : au démarrage, celle du téléphone ; un sélecteur dans « Mon profil » permet d'en changer.
  - **Textes** : 1 224 textes, rangés par domaine.
  - **Délégation** : l'extraction des textes a été confiée à OpenCode, en six lots. Chaque lot a été vérifié avant d'être appliqué : texte français identique, clés présentes, contrôle des types. L'IA a écrit elle-même les traductions anglaises et japonaises.
  - **Nouveau script `npm run i18n:check`** : vérifie que chaque clé existe dans les trois langues et qu'il ne reste aucun texte en dur.
- **Vérification de la mise en page** (demandée par l'étudiant) : captures au format téléphone, en français, anglais et japonais côte à côte, sur 20 écrans. Corrections faites :
  - kanji dessinés en glyphes chinois sur le web, par manque de l'attribut `lang` ;
  - onglet « プロフィール » coupé sur deux lignes, remplacé par « マイページ » ;
  - nombres séparés de leur unité en fin de ligne ;
  - initiale « 一 » qu'on prend pour un tiret.
- **Le back office n'est pas traduit** : il est en Twig, à part de l'app. L'étudiant a demandé de le traduire aussi. Ce sera fait avant l'écran de validation des marques (qui manque : les marques ajoutées ne pouvaient jamais être validées) et le bouton « Signaler » de l'app.
- **Erreurs et incidents** :
  - l'IA a laissé dans le README une phrase devenue fausse sur « Utilisateurs actifs » ; corrigé sur la branche de #70 ;
  - un commit local a embarqué des dossiers générés (`dist-e2e`, `cypress`) ; retirés avant de pousser ;
  - le manque de mémoire a arrêté le suivi des sous-agents, qui ont fini leur travail quand même ;
  - le conteneur PHP ne démarrait plus (cache à moitié supprimé) ; il a été nettoyé.


### 16/11 (suite) — Le back-office en trois langues, la langue dans Paramètres (PR #72, #71)

- **Prompts** (mot pour mot) :
  - « ok continue » ;
  - « met le bouton langue dans les settings , que ca soit sur l'app ou back office et quand tout est bon on testera » ;
  - « envoi une notif quand ta fini j'ai activé le rc ».
- **Back-office (#72)** : le composant Translation de Symfony, au format ICU. Deux domaines :
  - `admin` pour les textes des gabarits ;
  - `admin_flash` pour les messages écrits en français dans le code, où la clé est le texte français.
  - La langue se choisit dans une page **Paramètres** (`/admin/parametres`) et reste en session ; sans choix, on prend celle du navigateur (`AdminLocaleSubscriber`). Dates et montants suivent la langue. Ce qui est enregistré (motifs, décisions) reste dans la langue où il a été écrit.
- **App (#71)** : le sélecteur de langue quitte « Mon profil » pour l'écran **Paramètres**, comme demandé.

### 16/11 (après-midi) — Essai sur téléphone, données de démonstration, « Mon activité » (PR #73, #74)

- **Prompts** (mot pour mot) :
  - « lance tout je teste sur mon tel ,back-office aussi » ;
  - « j'arrive pas a obtenir de code pour se connecter au backoffice » ;
  - « met des fixtures d'action pour le back office , des scans reussis pret en cours objet ajoutés , des signalements des litiges etc » ;
  - « j'ai mis le partage de connexion gère l'ip pour expo » ;
  - « ferme le poer 8081 je l'ouvre manuellement pour avoir le qr code » ;
  - « deux problème ; j'ai un fetch failed de connection sur mobile alors qu'il fait le partage de connexion , et j'ai pas le back office user sur l'app avec ses stats perso » ;
  - « ouais un écran Mon activité dans le profil » ;
  - « donne moi la version de expo et react native » ;
  - « comment je justifie les kpi ducoup à l'oral ? » ;
  - « améliore l'UX de mon activité » ;
  - une capture de l'iPhone, avec « corrige » ;
  - « on a bien utilisé nexti18n pour la trad ».
- **Code du back-office** : la double authentification demande le code d'une application d'authentification (TOTP), pas un e-mail. L'IA a expliqué comment l'activer au premier accès et comment l'effacer en cas de perte du téléphone.
- **Données de démonstration (#73)** : commande `app:demo:back-office`, réservée au développement, qui ne fait rien si elle a déjà tourné. Elle crée 8 comptes, 31 objets et vêtements, 56 scans, 7 prêts (dont 2 en retard), 5 ventes, 3 litiges et 6 signalements, étalés sur plusieurs semaines pour que les évolutions des indicateurs aient un sens. Les tirages sont reproductibles et tout se fait dans une transaction.
- **« fetch failed »** : Expo lisait encore l'ancienne adresse du PC. Avec le partage de connexion de l'iPhone, le PC est en 172.20.10.2. L'adresse est lue au démarrage d'Expo, d'où le redémarrage nécessaire.
- **« Mon activité » (#74)** : un écran à part, dans le menu Profil, parce que les principes UX (§ 7) excluent un tableau de bord sur l'accueil. `GET /api/me/activity` renvoie des comptages agrégés pour le profil actif seulement :
  - inventaire : objets, vêtements, ajoutés ce mois ;
  - prêts : prêtés, en retard, empruntés, rendus ;
  - ventes ;
  - scans, avec la part de scans réussis.
- **Expérience utilisateur** :
  - chaque chiffre ouvre la liste qu'il compte ;
  - les couleurs sont celles des statuts de la charte ;
  - un retard passe en tête, en rouge ;
  - un état vide propose de scanner ;
  - les chiffres se mettent à jour en tirant vers le bas.
- **Correction d'après la capture** : les chiffres en Typolio étaient coupés en haut sur iOS ; ils passent par le composant `Heading`. Les cartes ont été alignées.
- **Questions** :
  - Expo 58.0.23, React Native 0.88.1 ;
  - les indicateurs du back-office se justifient par des questions d'administrateur (« l'app est-elle utilisée ? le scan tient-il sa promesse ? ») ;
  - next-i18next est fait pour Next.js. Le projet utilise i18next et react-i18next, la même base, adaptée à React Native, et Symfony Translation pour le back-office.
- **Erreurs de l'IA** :
  - elle a d'abord donné un mauvais nom de commande (`app:grant-admin` au lieu de `app:admin:grant`), corrigé ;
  - dans les données de démo, un même objet servait à la fois à un prêt et à une vente, corrigé.

### 17/11 — Journal des scans, pré-analyse IA des signalements et des litiges (PR #75)

- **Prompts** (mot pour mot) :
  - « dans les fonctions métier qui utilise l'IA il nous manque quoi ? » ;
  - « dans le back office , un journal d'erreurs pour les scans qui fail , savoir le temps de chargement , le modele qui a fail , etc... , et aussi une suggestion de mon prof , on fait une pipeline avec un llm qui aura pour travail , review les signalements et litige ( regarde les causes les avenants , il doit tout check et donner un pré-verdict entre pour les signalement ; sans suite / avertissement / sanction / ne sais pas , avec une réponse et une justification structuré , ainsi qu'un score de confiance , au dessus de 95% , il peut appliquer directement une sanction/avertissement/sans suite , en dessous , il résume la situation pour un admin. toute les décisions doivent etre logués , et peuvent etre reprise par un admin s'il considère qu'il y a eu une erreur commise ».
- **Ce qui manquait** : l'IA a comparé les fonctions prévues avec le code. Le scan par photo et par étiquette est fait. Le **moteur de suggestion de tenues**, entré dans le MVP le 21/09, n'avait que ses entités. La détection automatique des vêtements sur la photo du look avait été retirée volontairement.
- **Journal des scans** : le temps de chaque appel de modèle est maintenant mesuré. Une page du back-office affiche :
  - volume, part d'échecs, temps moyen et 95ᵉ centile ;
  - le bilan par modèle (réponses, échecs, temps) ;
  - les erreurs par famille (quota, modèle retiré, délai…) ;
  - le détail d'un scan, modèle par modèle.
- **Pré-analyse IA** :
  - **Le dossier** : un modèle de langage lit ce qu'un administrateur regarderait (contenu, motif, autres signalements, passé de l'auteur, fiabilité du signalant ; pour un litige, la chronologie de la commande et des deux parties). Il ne reçoit ni e-mail ni adresse.
  - **Le pré-verdict** : verdict, confiance de 0 à 100, résumé, justification, faits retenus, message proposé.
  - **Application** : à partir de 95 %, il l'applique lui-même au nom d'un compte technique « Modération IA » ; en dessous, il résume pour un administrateur.
  - **Journal** : tout est journalisé (`AiReview`, `ModerationAction`). Un administrateur peut valider, ou annuler : l'action est défaite et le signalement rouvert à son nom.
- **Choix de l'IA, à justifier à l'oral** : la confiance annoncée par un modèle n'est pas une probabilité fiable. L'IA n'applique donc seule que ce qu'un humain peut défaire. Les litiges (de l'argent est en jeu), le retrait d'une publication et les dossiers qui contiennent des phrases adressées à l'IA restent des propositions. Le seuil (95 %) est réglable.
- **Essai réel** : quatre dossiers analysés en 9 à 21 s. Tous sont restés des propositions (« ne sait pas » 40 % et 65 %, avertissement 85 %, acheteur 95 % sur un litige). Un essai a échoué : les deux Gemma étaient à court de quota et le modèle de raisonnement trop lent pour les 24 s d'une requête web. La commande planifiée a désormais 90 s par dossier.
- **Erreurs de l'IA** : les patchs passés par le shell ont encore perdu des antislashs et des apostrophes, ce qui a cassé une ligne de test et une description de migration. PHPStan les a repérées, puis elles ont été corrigées.
- **Vérifié** : PHPStan 0 erreur, linters OK, migration jouée. Tests écrits, à lancer par l'étudiant.

### 17/11 (suite) — Le moteur de suggestion de tenues (PR #76)

- **Prompt** (mot pour mot) : « bien sur apres ca tu fais aussi les 3 propositions poue le moteur de suggestion "look du jour" ».
- **Les trois volets proposés par l'IA, réalisés** :
  1. **la météo** : Open-Meteo, gratuit et sans clé. On prend la position du téléphone si l'utilisateur l'accepte, sinon la ville du logement ;
  2. **les règles** : chaleur selon la température, imperméable s'il pleut, occasion, goûts, pièces portées récemment, accord des couleurs. Elles retiennent quatre tenues candidates ;
  3. **l'IA**, qui choisit la meilleure des quatre et explique pourquoi dans la langue de l'utilisateur. Si elle ne répond pas, ce sont les règles qui décident.
- **App** : l'écran « Ta tenue », d'après la maquette : Remplacer, Je n'aime pas, J'aime cette tenue, Nouvelle tenue. Une carte sur l'accueil et un bouton dans le dressing y mènent. Textes en trois langues.
- **Essai réel** : environ 8 s par tenue (Troyes, 16 °C, pluie annoncée). Il a fait corriger cinq propositions absurdes :
  - une robe de soirée pour le travail ;
  - une tenue sans chaussures après « Nouvelle tenue » ;
  - une veste de ski au sport à 16 °C ;
  - un jean au sport ;
  - un short à 15 °C.

  Chacune est devenue une règle ferme ou un test.
- **Vérifié** : PHPStan, tsc, ESLint, `i18n:check` OK. Tests écrits, à lancer par l'étudiant.

### 17/11 (fin) — « J'aime » et commentaires du fil (PR #77)

- **Prompts** (mot pour mot) :
  - « lance tout je teste sur mon tel » ;
  - « j'ai vu les analyse , la j'ai posté un look , vérifie si tu l'as en db , et si oui met des fixtures de like / commentaire ».
- **Constat avant d'agir** : le look et sa publication étaient bien en base. Mais les « j'aime » n'existaient pas (ni table, ni route, ni bouton), l'app n'affichait pas les commentaires, et une publication pour les abonnés refuse les commentaires (règle du MDD). Des données de démo seules n'auraient rien montré. L'IA a posé la question ; l'étudiant a choisi de construire les deux.
- **Fait** :
  - les « j'aime » : l'entité `PostLike`, les routes, et dans l'app un cœur avec son compteur ;
  - les commentaires dans l'app, d'après la maquette (Répondre, Ton commentaire, Publier) ;
  - une commande de démo `app:demo:social`. Pour accepter des commentaires, elle a fait passer la publication « en croco » des abonnés aux amis ;
  - au passage, l'adresse de l'API pour Expo est revenue à celle du Wi-Fi.
- **Erreur de l'IA** : encore des apostrophes perdues dans un patch passé par le shell (tests). Elles ont été repérées avant le commit.
