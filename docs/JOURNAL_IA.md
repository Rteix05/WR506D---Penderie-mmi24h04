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
