// ============================================================
// Lot 14 — AUTHENTIFICATION, MENU D'AJOUT, VÊTEMENT
// (page "Maquette v2", sections 01, 02 et 05)
//
// 13 ecrans : les derniers de la refonte v2.
//
// ATTENTION — deux ecrans sont cibles par NOM DE CALQUE, pas par texte,
// dans penderie-prototype.js. Ces noms doivent etre reproduits a
// l'identique, sinon le menu radial et l'ecran de choix perdent leurs
// liens :
//   Menu d'ajout : « Voile », « Bulle Vêtement », « Bulle Objet »,
//                  « Bulle Logement », « Bulle Scanner », « Add activity »
//   Choix du type : « Carte Vêtement », « Carte Objet »
//
// Libelles cliquables : « SE CONNECTER », « SE CONNECTER COMME FABIEN »,
// « SE CONNECTER COMME BRICE », « Continuer », « Ajouter »,
// « Vetement ajoute ! », « Preter », « Modifier », « Enregistrer »,
// « Supprimer ce vetement », « Deplacer », « Vendre »,
// « Voir l'historique › », « Deplacer le vetement › ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 14 Final : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();

    async function comp(id) {
      try {
        const n = await figma.getNodeByIdAsync(id);
        return (n && n.type === "COMPONENT") ? n : null;
      } catch (e) { return null; }
    }
    const PIC = {
      tshirt:  await comp("39:50"),
      jacket:  await comp("39:55"),
      coat:    await comp("39:67"),
      pants:   await comp("39:82"),
      baskets: await comp("52:2013"),
      cap:     await comp("39:109"),
      scarf:   await comp("39:115"),
      robe:    await comp("52:2003"),
      cintre:  await comp("52:2024"),
      short:   await comp("39:74")
    };
    const LOGO = await comp("18:595");

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;
    const VET = "T-shirt Nike";
    const LOC_VET = "Maison principale › Chambre › Armoire › Étagère 2";

    // ---------- briques ----------

    function jauge(total, courant) {
      const b = frame("Jauge", { dir: "HORIZONTAL", gap: S.xs, px: GUT });
      for (let i = 0; i < total; i++) {
        const t = frame("Segment", {
          h: 4, radius: R.full, dir: "VERTICAL", primary: "FIXED", counter: "FIXED",
          fill: i <= courant ? C.primary : C.ink, fillOpacity: i <= courant ? 1 : 0.10
        });
        addFill(b, t);
      }
      return b;
    }

    function zonePhoto(hauteur, pic, legende) {
      const z = frame("Field/Upload photo", {
        dir: "VERTICAL", gap: S.md, w: W - GUT * 2, h: hauteur, radius: R.lg,
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED", clip: true
      });
      if (pic) {
        try {
          const inst = pic.createInstance();
          inst.rescale((hauteur * 0.5) / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          z.appendChild(inst);
        } catch (e) {}
      }
      if (legende) z.appendChild(text(legende, { size: 12, color: C.sub }));
      return z;
    }

    function attributs(liste) {
      const zone = frame("Attributs", {
        dir: "HORIZONTAL", gap: S.sm, gapY: S.sm, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < liste.length; i++) {
        const a = frame("Garment/Attribute/" + liste[i], {
          dir: "HORIZONTAL", radius: R.full, px: S.md, h: 32,
          counter: "FIXED", align: "CENTER", fill: C.white, shadow: SHADOW_E1
        });
        a.appendChild(text(liste[i], { font: FONT_LB, size: 12, color: C.ink }));
        zone.appendChild(a);
      }
      return zone;
    }

    function heroVetement(col, nom, marque, statut, tone, pic, glypheRetour) {
      const hero = frame("Detail/Hero photo", {
        dir: "VERTICAL", w: W, h: 320, primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER", clip: true
      });
      if (pic) {
        try {
          const inst = pic.createInstance();
          inst.rescale(200 / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          hero.appendChild(inst);
        } catch (e) {}
      }
      col.appendChild(hero);
      overlay(hero, boutonRetour(glypheRetour || "X"), GUT, S.xl);

      const tete = frame("Titre", { dir: "VERTICAL", gap: S.sm, px: GUT });
      const ligne = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(nom, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      g.appendChild(text(marque, { size: 12, color: C.sub }));
      ligne.appendChild(g);
      if (statut) ligne.appendChild(statusPill(statut, tone));
      addFill(tete, ligne);
      addFill(col, tete);
      return hero;
    }

    function blocLocalisation(titre, chemin, lien) {
      const c = card("Card/Section/Localisation", { gap: S.sm });
      c.appendChild(text(titre, { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(chemin, UTIL_CARTE, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      if (lien) c.appendChild(text(lien, { size: 12, color: C.primary }));
      return c;
    }

    // ============ 1. Connexion ============
    ecran("Authentification — Connexion", function (screen) {
      const col = preparer(screen, 40, 0);

      const bande = frame("Entete", {
        dir: "VERTICAL", w: W, gap: S.lg, px: GUT, pt: 96, pb: 56,
        align: "CENTER", primary: "AUTO", counter: "FIXED",
        fill: C.primary, fillOpacity: 0.06
      });
      if (LOGO) {
        try {
          const li = LOGO.createInstance();
          li.rescale(72 / Math.max(li.width, li.height));
          bande.appendChild(li);
        } catch (e) {}
      }
      const t = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      t.appendChild(text("PENDERIE", { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      t.appendChild(para("Range, retrouve, prête. Entre amis, et sans rien publier.",
        W - GUT * 2, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bande, t);
      col.appendChild(bande);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Adresse e-mail", "mathis@example.com"));
      addFill(champs, champSelect("Mot de passe", "· · · · · · · ·"));
      addFill(col, champs);

      const oubli = frame("Lien", { dir: "HORIZONTAL", justify: "MAX", px: GUT });
      oubli.appendChild(text("Mot de passe oublié ?", { size: 12, color: C.primary }));
      addFill(col, oubli);

      barreActions(col, bouton("SE CONNECTER", "primary"), null, null, null);

      // Raccourcis de demonstration : conserves tels quels, le prototype
      // s'en sert pour entrer dans l'app sans formulaire.
      const demo = frame("Section/Demo", { dir: "VERTICAL", gap: S.md });
      addFill(demo, enteteSection("Comptes de démonstration", null));
      const d = frame("Detail/Action bar", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(d, bouton("SE CONNECTER COMME FABIEN", "secondary"));
      addFill(d, bouton("SE CONNECTER COMME BRICE", "secondary"));
      addFill(demo, d);
      addFill(col, demo);

      const inscr = frame("Lien", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      inscr.appendChild(text("Pas encore de compte ? Créer un compte",
        { font: FONT_LB, size: 12, color: C.primary }));
      addFill(col, inscr);
      finaliser(screen, col);
    });

    // ============ 2. E-mail de bienvenue ============
    // Ce n'est pas un ecran d'app mais la maquette d'un e-mail : on le
    // presente comme tel, dans un cadre de message.
    ecran("Authentification — E-mail de bienvenue", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("E-mail de bienvenue", "Envoyé à l'inscription"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("L'en-tête", [
        ligneInfo("De", "Penderie"),
        ligneInfo("À", "mathis@example.com"),
        ligneInfo("Objet", "Bienvenue dans ta penderie")
      ]));

      const corps = card("Card/Section/Message", { gap: S.md });
      const entete = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      if (LOGO) {
        try {
          const li = LOGO.createInstance();
          li.rescale(32 / Math.max(li.width, li.height));
          entete.appendChild(li);
        } catch (e) {}
      }
      entete.appendChild(text("PENDERIE", { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      addFill(corps, entete);
      corps.appendChild(para("Bonjour Mathis,", UTIL_CARTE,
        { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      corps.appendChild(para("Ton compte est prêt. Commence par ajouter un logement, puis un premier objet : tu sauras toujours où il est rangé et à qui tu l'as prêté.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      corps.appendChild(para("Ta penderie est privée : rien n'est visible tant que tu n'as pas partagé quelque chose.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      const cta = frame("Detail/Action bar", { dir: "VERTICAL" });
      addFill(cta, bouton("Ouvrir Penderie", "primary"));
      addFill(corps, cta);
      corps.appendChild(para("À bientôt,\nL'équipe Penderie", UTIL_CARTE,
        { size: 12, color: C.sub, lineHeight: 18 }));
      addFill(blocs, corps);

      addFill(blocs, carteSection("Le pied de page", [
        ligneInfo("Désabonnement", "En un clic"),
        ligneInfo("Données", "Jamais revendues")
      ]));
      addFill(col, blocs);
      finaliser(screen, col);
    });

    // ============ 3. Menu d'ajout ============
    // Menu radial pose en absolu au-dessus d'un voile. Les noms de
    // calques « Voile » et « Bulle ... » sont les zones du prototype :
    // ne pas les renommer.
    // L'ecran « Menu d'ajout » a ete remanie A LA MAIN dans Figma apres le
    // premier passage : les bulles « Vetement » et « Objet » y ont fusionne
    // en « Habit/Objet » et une bulle « Cartons » a ete ajoutee. Le rebatir
    // ecraserait ce travail, donc le bloc est desactive. Ne remettre a true
    // qu'apres accord explicite de l'utilisateur.
    const RUN_MENU_AJOUT = false;
    if (RUN_MENU_AJOUT) ecran("Accueil — Menu d'ajout", function (screen) {
      const olds = screen.children.slice();
      for (let i = 0; i < olds.length; i++) olds[i].remove();
      screen.layoutMode = "NONE";
      screen.fills = solid(C.bg);
      screen.clipsContent = true;
      screen.resize(W, H);

      const voile = frame("Voile", {
        w: W, h: H, dir: "VERTICAL", primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.58
      });
      screen.appendChild(voile);
      voile.x = 0; voile.y = 0;

      const titre = text("Qu'est-ce que tu ajoutes ?", {
        font: FONT_T, size: 24, color: C.white, lineHeight: 30, align: "CENTER"
      });
      titre.textAutoResize = "HEIGHT";
      titre.resize(W - GUT * 2, titre.height);
      screen.appendChild(titre);
      titre.x = GUT; titre.y = H - 420;

      // Quatre bulles en arc au-dessus du FAB : deux hautes ecartees,
      // deux basses rapprochees, pour rester atteignables au pouce.
      const bulles = [
        ["Bulle Vêtement", "Vêtement", "Un haut, un bas, une paire", 40,  H - 340],
        ["Bulle Objet",    "Objet",    "Outil, livre, matériel",     213, H - 340],
        ["Bulle Logement", "Logement", "Maison, cave, bureau",       40,  H - 224],
        ["Bulle Scanner",  "Scanner",  "Photographier pour remplir", 213, H - 224]
      ];
      for (let i = 0; i < bulles.length; i++) {
        const b = bulles[i];
        const bulle = frame(b[0], {
          dir: "VERTICAL", gap: S.xs, w: 140, radius: R.md, fill: C.white,
          px: S.md, py: S.md, shadow: SHADOW_E2, primary: "AUTO", counter: "FIXED"
        });
        const rond = frame("Illustration", {
          w: 36, h: 36, radius: R.full, fill: C.primary, fillOpacity: 0.12,
          dir: "VERTICAL", align: "CENTER", justify: "CENTER",
          primary: "FIXED", counter: "FIXED"
        });
        rond.appendChild(text(b[1].slice(0, 1), { font: FONT_LB, size: 14, color: C.primary }));
        bulle.appendChild(rond);
        bulle.appendChild(text(b[1], { font: FONT_LB, size: 16, color: C.ink }));
        bulle.appendChild(para(b[2], 140 - S.md * 2, { size: 12, color: C.sub, lineHeight: 16 }));
        screen.appendChild(bulle);
        bulle.x = b[3]; bulle.y = b[4];
      }

      // Le FAB reprend sa place exacte dans la barre : le menu doit
      // donner l'impression de s'ouvrir depuis lui.
      if (NAVIC && NAVIC.fab) {
        try {
          const fab = NAVIC.fab.createInstance();
          fab.rescale(60 / Math.max(fab.width, fab.height));
          screen.appendChild(fab);
          fab.x = (W - fab.width) / 2;
          fab.y = H - NAVH - fab.height / 2 + 6;
          fab.effects = [SHADOW_E2];
        } catch (e) {}
      }

      const fermer = text("Fermer", { font: FONT_LB, size: 12, color: C.white, align: "CENTER" });
      fermer.textAutoResize = "HEIGHT";
      fermer.resize(W - GUT * 2, fermer.height);
      screen.appendChild(fermer);
      fermer.x = GUT; fermer.y = H - 128;
    });

    // ============ 4. Ajouter · Choix du type ============
    // « Carte Vêtement » et « Carte Objet » : noms de calques cibles.
    ecran("Accueil — Ajouter · Choix du type", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Tu ajoutes quoi ?", "Les deux se rangent au même endroit"));

      const cartes = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const choix = [
        ["Carte Vêtement", "Vêtement", "Il rejoint ton dressing : taille, marque, couleur, historique de port.", PIC.tshirt],
        ["Carte Objet", "Objet", "Il rejoint ton inventaire : catégorie, état, rangement précis.", PIC.pants]
      ];
      for (let i = 0; i < choix.length; i++) {
        const c = choix[i];
        const carte = frame(c[0], {
          dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
          px: S.md, py: S.md, align: "CENTER", shadow: SHADOW_E1
        });
        carte.appendChild(photoBox(72, 72, R.sm, c[3], C.ink));
        const g = frame("Texte", { dir: "VERTICAL", gap: S.xs });
        g.appendChild(text(c[1], { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
        g.appendChild(para(c[2], 190, { size: 12, color: C.sub, lineHeight: 16 }));
        carte.appendChild(g);
        addFill(cartes, carte);
        try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      }
      addFill(col, cartes);

      const blocs = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const n = card("Card/Section/Info", { gap: S.sm });
      n.appendChild(para("Un vêtement peut être prêté et vendu comme un objet. La différence est ce qu'on te demande à l'ajout, et l'endroit où tu le retrouves.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      addFill(blocs, n);
      addFill(col, blocs);

      const scan = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(scan, lienRangee("Scanner à la place", "Photographie, on remplit pour toi"));
      addFill(col, scan);
      finaliser(screen, col);
    });

    // ============ 5. Vêtement · Ajout · Type ============
    ecran("Vêtement — Ajout · Type", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, jauge(4, 0));
      addFill(col, titrePage("C'est quoi ?", "Étape 1 sur 4"));

      const types = [
        ["T-shirt", PIC.tshirt], ["Chemise", PIC.tshirt], ["Pull", PIC.coat],
        ["Veste", PIC.jacket], ["Manteau", PIC.coat], ["Pantalon", PIC.pants],
        ["Short", PIC.short], ["Robe", PIC.robe], ["Chaussures", PIC.baskets],
        ["Casquette", PIC.cap], ["Écharpe", PIC.scarf], ["Autre", PIC.cintre]
      ];
      const largeur = Math.floor((W - GUT * 2 - S.md * 2) / 3);
      const g = frame("Grille", {
        dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < types.length; i++) {
        const t = types[i];
        const actif = i === 0;
        const c = frame("Card/Garment/" + t[0], {
          dir: "VERTICAL", gap: S.sm, w: largeur, radius: R.md,
          fill: actif ? C.primary : C.white, fillOpacity: actif ? 0.12 : 1,
          px: S.sm, py: S.md, align: "CENTER", shadow: actif ? null : SHADOW_E1,
          primary: "AUTO", counter: "FIXED"
        });
        c.appendChild(photoBox(largeur - S.sm * 2, 56, R.sm, t[1], C.ink));
        c.appendChild(para(t[0], largeur - S.sm * 2,
          { font: FONT_LB, size: 12, color: actif ? C.primary : C.ink, align: "CENTER", lineHeight: 16 }));
        g.appendChild(c);
      }
      addFill(col, g);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Le type sert à ranger le vêtement dans la bonne catégorie du dressing.");
      finaliser(screen, col);
    });

    // ============ 6. Vêtement · Ajout · Informations ============
    ecran("Vêtement — Ajout · Informations", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 1));
      addFill(col, titrePage("Ton vêtement", "Étape 2 sur 4"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, PIC.tshirt, "Prendre une photo ou scanner l'étiquette"));
      addFill(col, zone);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Nom", VET));
      addFill(champs, champSelect("Marque", "Nike"));
      addFill(champs, groupeChips("Taille", ["XS", "S", "M", "L", "XL", "XXL"], ["M"]));
      addFill(champs, champSelect("Couleur", "Noir"));
      // lot 24 : les usages sont des familles de style, à choix multiple
      addFill(champs, groupeChips("Usages (plusieurs choix)",
        ["Travail", "Quotidien", "Sport", "Soirée", "Événement", "Maison"], ["Quotidien", "Sport"]));
      addFill(champs, groupeChips("Style",
        ["Casual", "Streetwear", "Détente", "Fitness", "Smart casual"], ["Streetwear", "Fitness"]));
      addFill(champs, lienRangee("Voir les catégories de style", "Ce que chaque usage exclut"));
      addFill(champs, groupeChips("État",
        ["Neuf", "Très bon état", "Bon état", "Usé"], ["Très bon état"]));
      addFill(col, champs);

      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 7. Vêtement · Ajout · Localisation ============
    ecran("Vêtement — Ajout · Localisation", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 2));
      addFill(col, titrePage("Où tu le ranges ?", "Étape 3 sur 4"));

      const fil = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Chemin", { gap: S.sm });
      c.appendChild(text("Emplacement choisi", { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(LOC_VET, UTIL_CARTE, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      addFill(fil, c);
      addFill(col, fil);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Logement", "Maison principale"));
      addFill(champs, champSelect("Pièce", "Chambre"));
      addFill(champs, champSelect("Rangement", "Armoire"));
      addFill(champs, champSelect("Étagère", "Étagère 2"));
      addFill(col, champs);

      const rec = frame("Section/Recents", { dir: "VERTICAL", gap: S.md });
      addFill(rec, enteteSection("Emplacements récents", null));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("Chambre › Armoire › Étagère 2", "18 vêtements rangés ici"));
      addFill(l, lienRangee("Chambre › Penderie", "24 vêtements rangés ici"));
      addFill(rec, l);
      addFill(col, rec);

      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 8. Vêtement · Ajout · Vérification ============
    ecran("Vêtement — Ajout · Vérification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 3));
      addFill(col, titrePage("Vérifie ton vêtement", "Étape 4 sur 4"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, PIC.tshirt, null));
      addFill(col, zone);

      addFill(col, attributs(["Taille M", "Noir", "Quotidien · Sport", "Très bon état"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("Le vêtement", [
        ligneInfo("Nom", VET),
        ligneInfo("Marque", "Nike"),
        ligneInfo("Catégorie", "Hauts")
      ]));
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, null));
      addFill(blocs, carteSection("À l'ajout", [
        ligneInfo("Statut", "Dans ma penderie"),
        ligneInfo("Visible par", "Toi seul")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Ajouter", "primary"),
        [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 9. Vêtement · Ajout · Confirmation ============
    ecran("Vêtement — Ajout · Confirmation", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Vêtement ajouté !", "49 vêtements dans ton dressing."));
      addFill(col, z);

      addFill(col, titrePage(VET, "Dans ma penderie · Chambre"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, PIC.tshirt, null));
      addFill(col, zone);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, null));
      addFill(blocs, carteSection("Et maintenant", [
        ligneInfo("Le porter", "Il entre dans les suggestions de tenue"),
        ligneInfo("Le prêter", "À un ami, en 3 étapes"),
        ligneInfo("Le vendre", "Visible par tes amis")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Voir le vêtement", "primary"),
        [bouton("Ajouter un autre vêtement", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 10. Vêtement · Fiche ============
    ecran("Vêtement — Fiche", function (screen) {
      const col = preparer(screen, 40, 0);
      heroVetement(col, VET, "Nike · Hauts · M", "Dans ma penderie", "penderie", PIC.tshirt, "<");
      addFill(col, attributs(["Taille M", "Noir", "Quotidien · Sport", "Très bon état"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, "Déplacer le vêtement ›"));
      const h = card("Card/Section/Historique", { gap: S.sm });
      h.appendChild(text("Historique de port", { font: FONT_LB, size: 12, color: C.sub }));
      h.appendChild(para("Porté 12 fois · dernière fois le 8 septembre", UTIL_CARTE,
        { size: 16, color: C.ink, lineHeight: 22 }));
      h.appendChild(text("Voir l'historique ›", { size: 12, color: C.primary }));
      addFill(blocs, h);
      addFill(col, blocs);

      barreActions(col,
        bouton("Prêter", "primary"),
        [bouton("Modifier", "secondary"), bouton("Déplacer", "secondary"), bouton("Vendre", "secondary")],
        "Supprimer ce vêtement", null);
      finaliser(screen, col);
    });

    // ============ 11. Vêtement · Modification ============
    ecran("Vêtement — Modification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Modifier", VET));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, PIC.tshirt, "Changer la photo"));
      addFill(col, zone);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Nom", VET));
      addFill(champs, champSelect("Marque", "Nike"));
      addFill(champs, groupeChips("Taille", ["XS", "S", "M", "L", "XL", "XXL"], ["M"]));
      addFill(champs, champSelect("Couleur", "Noir"));
      addFill(champs, groupeChips("Usages (plusieurs choix)",
        ["Travail", "Quotidien", "Sport", "Soirée", "Événement", "Maison"], ["Quotidien", "Sport"]));
      addFill(champs, groupeChips("Style",
        ["Casual", "Streetwear", "Détente", "Fitness", "Smart casual"], ["Streetwear", "Fitness"]));
      addFill(champs, groupeChips("État",
        ["Neuf", "Très bon état", "Bon état", "Usé"], ["Bon état"]));
      addFill(col, champs);

      const blocs = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, "Déplacer le vêtement ›"));
      addFill(col, blocs);

      barreActions(col, bouton("Continuer", "primary"), null,
        "Supprimer ce vêtement", null);
      finaliser(screen, col);
    });

    // ============ 12. Vêtement · Modification · Vérification ============
    ecran("Vêtement — Modification · Vérification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Vérifie tes changements", VET));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(160, PIC.tshirt, null));
      addFill(col, zone);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      // Ce qui change est isole : une verification qui reliste tout
      // n'aide pas a reperer la modification.
      const ch = card("Card/Section/Changements", { gap: S.md });
      ch.appendChild(text("Ce qui change", { font: FONT_LB, size: 12, color: C.sub }));
      const l1 = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
      l1.appendChild(text("État", { size: 12, color: C.sub }));
      const v1 = frame("Valeurs", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER" });
      v1.appendChild(text("Très bon état", { size: 12, color: C.sub, opacity: 0.85 }));
      v1.appendChild(text("›", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
      v1.appendChild(text("Bon état", { font: FONT_LB, size: 16, color: C.ink }));
      l1.appendChild(v1);
      addFill(ch, l1);
      addFill(blocs, ch);

      addFill(blocs, carteSection("Inchangé", [
        ligneInfo("Nom", VET),
        ligneInfo("Marque", "Nike"),
        ligneInfo("Taille", "M"),
        ligneInfo("Localisation", "Étagère 2")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Enregistrer", "primary"),
        [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 13. Vêtement · Modification · Confirmation ============
    ecran("Vêtement — Modification · Confirmation", function (screen) {
      const col = preparer(screen, 40, 0);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT, pt: S.xl });
      addFill(z, toastSucces("Modifications enregistrées", "L'état est passé à « Bon état »."));
      addFill(col, z);

      heroVetement(col, VET, "Nike · Hauts · M", "Dans ma penderie", "penderie", PIC.tshirt, "<");
      addFill(col, attributs(["Taille M", "Noir", "Quotidien · Sport", "Bon état"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, "Déplacer le vêtement ›"));
      const h = card("Card/Section/Historique", { gap: S.sm });
      h.appendChild(text("Historique de port", { font: FONT_LB, size: 12, color: C.sub }));
      h.appendChild(para("Porté 12 fois · dernière fois le 8 septembre", UTIL_CARTE,
        { size: 16, color: C.ink, lineHeight: 22 }));
      h.appendChild(text("Voir l'historique ›", { size: 12, color: C.primary }));
      addFill(blocs, h);
      addFill(col, blocs);

      barreActions(col,
        bouton("Prêter", "primary"),
        [bouton("Modifier", "secondary"), bouton("Déplacer", "secondary"), bouton("Vendre", "secondary")],
        "Supprimer ce vêtement", null);
      finaliser(screen, col);
    });

    rapport("Lot 14 Final");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
