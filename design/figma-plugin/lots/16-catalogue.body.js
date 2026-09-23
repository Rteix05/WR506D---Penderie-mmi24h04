// ============================================================
// Lot 16 — CATALOGUE DE COMPOSANTS  (page « Components »)
//
// Construit la bibliothèque du DS v2 sur la page Components, à partir
// des MÊMES fonctions que celles qui ont dessiné les 131 écrans : ce
// qui est ici est donc pixel pour pixel ce qui est dans la maquette.
//
// NE TOUCHE À AUCUNE FRAME DE « Maquette v2 » : le script n'ouvre même
// pas cette page. Sur Components, il ne supprime que son propre
// catalogue (repéré par son nom) avant de le reconstruire — les
// composants existants (Vetements 39:124, Player, Add activity, box 1…)
// ne sont jamais touchés.
//
// Les familles à plusieurs états deviennent de vrais component sets à
// variantes (« Style=Primary » → set « Button »).
// ============================================================

(async function () {
  try {
    figma.notify("Lot 16 Catalogue : demarrage...", { timeout: 1500 });

    // ---------- ouverture de la page Components ----------
    await figma.loadAllPagesAsync();
    await figma.loadFontAsync(FONT_T);
    await figma.loadFontAsync(FONT_L);
    await figma.loadFontAsync(FONT_LB);

    const cible = figma.root.children.filter(function (p) {
      return /component/i.test(p.name);
    })[0];
    if (!cible) throw new Error("page « Components » introuvable");
    await cible.loadAsync();
    figma.currentPage = cible;
    PAGE = cible;                      // pour que rapport() ecrive au bon endroit

    await chargerNav();
    await chargerAmis();

    async function comp(id) {
      try {
        const n = await figma.getNodeByIdAsync(id);
        return (n && n.type === "COMPONENT") ? n : null;
      } catch (e) { return null; }
    }
    const PIC = {
      tshirt:  await comp("39:50"),
      jacket:  await comp("39:55"),
      pants:   await comp("39:82"),
      baskets: await comp("52:2013"),
      coat:    await comp("39:67"),
      cintre:  await comp("52:2024")
    };

    // ---------- emplacement : sous tout ce qui existe deja ----------
    const MARQUE = "DS v2 · ";        // prefixe des titres de categorie
    let bas = 0, gauche = null;
    const existants = PAGE.children.slice();
    for (let i = 0; i < existants.length; i++) {
      const n = existants[i];
      if (typeof n.y !== "number") continue;
      bas = Math.max(bas, n.y + (n.height || 0));
      gauche = gauche == null ? n.x : Math.min(gauche, n.x);
    }
    const X0 = gauche == null ? 0 : gauche;
    let Y0 = bas + 400;

    // Relançable : on efface le catalogue precedent (et lui seul) avant
    // de le refaire, sinon chaque execution empilerait un doublon.
    let efface = 0;
    for (let i = 0; i < existants.length; i++) {
      const n = existants[i];
      let mien = false;
      try { mien = n.getPluginData("penderie-catalogue") === "1"; } catch (e) {}
      if (mien) {
        if (typeof n.y === "number") Y0 = Math.min(Y0, n.y);
        try { n.remove(); efface++; } catch (e) {}
      }
    }

    const LARGEUR_MAX = 1700;
    const GAP_X = 56, GAP_Y = 88;
    let curX = X0, curY = Y0, hautRangee = 0;

    function marquer(n) {
      try { n.setPluginData("penderie-catalogue", "1"); } catch (e) {}
      return n;
    }

    function retourLigne() {
      if (hautRangee > 0) { curY += hautRangee + GAP_Y; }
      curX = X0;
      hautRangee = 0;
    }

    function categorie(titre) {
      retourLigne();
      curY += 40;
      const t = figma.createText();
      t.fontName = FONT_T;
      t.characters = MARQUE + titre;
      t.fontSize = 32;
      t.fills = solid(C.ink);
      t.textAutoResize = "WIDTH_AND_HEIGHT";
      t.name = "Titre · " + titre;
      PAGE.appendChild(t);
      t.x = X0; t.y = curY;
      marquer(t);
      curY += Math.ceil(t.height) + 32;
      curX = X0;
      hautRangee = 0;
    }

    // Pose un noeud dans la grille et avance le curseur.
    function poser(n) {
      if (curX > X0 && curX + n.width > X0 + LARGEUR_MAX) retourLigne();
      PAGE.appendChild(n);
      n.x = curX; n.y = curY;
      marquer(n);
      curX += n.width + GAP_X;
      hautRangee = Math.max(hautRangee, n.height);
      return n;
    }

    // Une frame -> un composant, pose dans la grille.
    let NB = 0;
    function composant(nom, node) {
      node.name = nom;
      PAGE.appendChild(node);              // createComponentFromNode veut un noeud pose
      const c = figma.createComponentFromNode(node);
      c.name = nom;
      NB++;
      return poser(c);
    }

    // Plusieurs frames -> un component set a variantes.
    // Chaque nom doit etre au format « Propriete=Valeur ».
    function jeu(nom, variantes) {
      const comps = [];
      for (let i = 0; i < variantes.length; i++) {
        const v = variantes[i];
        v[1].name = v[0];
        PAGE.appendChild(v[1]);
        const c = figma.createComponentFromNode(v[1]);
        c.name = v[0];
        comps.push(c);
        NB++;
      }
      const set = figma.combineAsVariants(comps, PAGE);
      set.name = nom;
      set.layoutMode = "HORIZONTAL";
      set.itemSpacing = 24;
      set.counterAxisSpacing = 24;
      set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24;
      set.primaryAxisSizingMode = "AUTO";
      set.counterAxisSizingMode = "AUTO";
      set.counterAxisAlignItems = "CENTER";
      return poser(set);
    }

    // ---------- briques du catalogue qui n'existent pas dans la lib ----------

    function carteVetement(nom, marque, statut, tone, pic) {
      const largeur = 176;
      const c = frame("Card/Garment", {
        dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
        shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
      });
      const ph = photoBox(largeur, 210, 0, pic, C.ink);
      c.appendChild(ph);
      if (statut) overlay(ph, statusPill(statut, tone, true), S.sm, S.sm);
      const b = frame("Texte", { dir: "VERTICAL", gap: 2, px: S.md, pt: S.md, pb: S.md });
      b.appendChild(para(nom, largeur - S.md * 2, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
      b.appendChild(para(marque, largeur - S.md * 2, { size: 12, color: C.sub }));
      addFill(c, b);
      return c;
    }

    function cartePlace(nom, meta) {
      const largeur = 176;
      const c = frame("Card/Place", {
        dir: "VERTICAL", gap: S.md, w: largeur, radius: R.md, fill: C.white,
        px: S.md, py: S.md, shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED"
      });
      const rond = frame("Illustration", {
        w: 48, h: 48, radius: R.md, fill: C.primary, fillOpacity: 0.12,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      rond.appendChild(text(nom.slice(0, 1), { font: FONT_LB, size: 16, color: C.primary }));
      c.appendChild(rond);
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(para(nom, largeur - S.md * 2, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
      g.appendChild(para(meta, largeur - S.md * 2, { size: 12, color: C.sub, lineHeight: 16 }));
      addFill(c, g);
      return c;
    }

    function carteOutfit() {
      const c = frame("Card/Outfit", {
        dir: "HORIZONTAL", gap: S.md, w: 353, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", shadow: SHADOW_E1, counter: "AUTO"
      });
      const mini = frame("Apercus", { dir: "HORIZONTAL", gap: S.xs });
      const pieces = [PIC.jacket, PIC.tshirt, PIC.pants];
      for (let i = 0; i < 3; i++) mini.appendChild(photoBox(40, 56, R.xs, pieces[i], C.ink));
      c.appendChild(mini);
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text("Bureau décontracté", { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para("Travail · portée 4 fois", 150, { size: 12, color: C.sub, lineHeight: 16 }));
      c.appendChild(g);
      c.appendChild(text("›", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return c;
    }

    function champTexteSimple(label, valeur) {
      const b = frame("Field/Text", { dir: "VERTICAL", gap: S.xs, w: 353, counter: "FIXED" });
      b.appendChild(text(label, { font: FONT_LB, size: 12, color: C.sub }));
      const f = frame("Champ", {
        dir: "HORIZONTAL", fill: C.white, radius: R.sm, px: S.lg, h: 48,
        counter: "FIXED", align: "CENTER", shadow: SHADOW_E1
      });
      f.appendChild(text(valeur, { size: 16, color: C.ink }));
      addFill(b, f);
      return b;
    }

    function zoneUpload() {
      const z = frame("Field/Upload photo", {
        dir: "VERTICAL", gap: S.md, w: 353, h: 180, radius: R.lg,
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED", clip: true
      });
      if (PIC.tshirt) {
        try {
          const inst = PIC.tshirt.createInstance();
          inst.rescale(90 / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          z.appendChild(inst);
        } catch (e) {}
      }
      z.appendChild(text("Prendre une photo", { size: 12, color: C.sub }));
      return z;
    }

    function filAriane() {
      const b = frame("Nav/Breadcrumb", { dir: "HORIZONTAL", gap: S.xs, align: "CENTER" });
      const chemin = ["Maison principale", "Garage", "Étagère 2"];
      for (let i = 0; i < chemin.length; i++) {
        const dernier = i === chemin.length - 1;
        const p = frame("Chip/Category", {
          dir: "HORIZONTAL", radius: R.full, px: S.md, h: 32, counter: "FIXED", align: "CENTER",
          fill: dernier ? C.primary : C.white, shadow: dernier ? null : SHADOW_E1
        });
        p.appendChild(text(chemin[i], { font: FONT_LB, size: 12, color: dernier ? C.white : C.sub }));
        b.appendChild(p);
        if (!dernier) b.appendChild(text("›", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
      }
      return b;
    }

    function jaugeEtapes(courant) {
      const b = frame("Jauge", { dir: "HORIZONTAL", gap: S.xs, w: 353, counter: "FIXED" });
      for (let i = 0; i < 4; i++) {
        const t = frame("Segment", {
          h: 4, radius: R.full, dir: "VERTICAL", primary: "FIXED", counter: "FIXED",
          fill: i <= courant ? C.primary : C.ink, fillOpacity: i <= courant ? 1 : 0.10
        });
        addFill(b, t);
      }
      return b;
    }

    function modaleConfirm() {
      const c = frame("Modal/Confirm", {
        dir: "VERTICAL", gap: S.lg, w: 353, radius: R.lg, fill: C.white,
        px: S.xl, py: S.xl, shadow: SHADOW_E2, counter: "FIXED"
      });
      const util = 353 - S.xl * 2;
      const t = frame("Texte", { dir: "VERTICAL", gap: S.sm });
      t.appendChild(para("Supprimer cet objet ?", util, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      t.appendChild(para("La Perceuse Bosch, sa photo et son historique de prêts seront définitivement effacés.",
        util, { size: 16, color: C.sub, lineHeight: 22 }));
      addFill(c, t);
      const actions = frame("Detail/Action bar", { dir: "VERTICAL", gap: S.md });
      addFill(actions, bouton("Supprimer", "danger"));
      addFill(actions, bouton("Annuler", "secondary"));
      addFill(c, actions);
      return c;
    }

    function etatVideCompose() {
      const bloc = frame("Empty state", {
        dir: "VERTICAL", gap: S.lg, w: 353, px: GUT, py: S.huge,
        align: "CENTER", justify: "CENTER", counter: "FIXED"
      });
      const rond = frame("Illustration", {
        dir: "VERTICAL", w: 120, h: 120, radius: R.full, fill: C.ink, fillOpacity: 0.04,
        align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED", clip: true
      });
      if (PIC.cintre) {
        try {
          const inst = PIC.cintre.createInstance();
          inst.rescale(70 / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          rond.appendChild(inst);
        } catch (e) {}
      }
      bloc.appendChild(rond);
      const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      txt.appendChild(para("Ton dressing est vide", 313,
        { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      txt.appendChild(para("Ajoute ton premier vêtement : il apparaîtra ici avec sa photo.",
        293, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bloc, txt);
      const a = frame("Action", { dir: "VERTICAL", pt: S.sm });
      a.appendChild(bouton("Ajouter un vêtement", "primary"));
      bloc.appendChild(a);
      return bloc;
    }

    function squelette() {
      const c = frame("Loader/Skeleton carte", {
        dir: "VERTICAL", gap: 0, w: 176, radius: R.md, fill: C.white,
        shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
      });
      c.appendChild(frame("Photo", {
        w: 176, h: 194, fill: C.ink, fillOpacity: 0.06,
        dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
      }));
      const b = frame("Texte", { dir: "VERTICAL", gap: S.sm, px: S.md, pt: S.md, pb: S.md });
      b.appendChild(frame("Ligne", { w: 152, h: 12, radius: R.xs, fill: C.ink, fillOpacity: 0.08, dir: "VERTICAL", primary: "FIXED", counter: "FIXED" }));
      b.appendChild(frame("Ligne", { w: 90, h: 10, radius: R.xs, fill: C.ink, fillOpacity: 0.06, dir: "VERTICAL", primary: "FIXED", counter: "FIXED" }));
      addFill(c, b);
      return c;
    }

    function notification(titre, texte, tone, nonLue) {
      const coul = couleurDe(tone);
      const r = frame("Notification/Row", {
        dir: "HORIZONTAL", gap: S.md, w: 353, radius: R.md, px: S.md, py: S.md,
        align: "MIN", counter: "FIXED",
        fill: nonLue ? coul : C.white, fillOpacity: nonLue ? 0.06 : 1,
        shadow: nonLue ? null : SHADOW_E1
      });
      const rond = frame("Pastille", {
        w: 40, h: 40, radius: R.full, fill: coul, fillOpacity: 0.16,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      rond.appendChild(text(titre.slice(0, 1), { font: FONT_LB, size: 16, color: coul }));
      r.appendChild(rond);
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para(texte, 229, { size: 12, color: C.sub, lineHeight: 16 }));
      r.appendChild(g);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    function attribut(mot) {
      const a = frame("Garment/Attribute", {
        dir: "HORIZONTAL", radius: R.full, px: S.md, h: 32,
        counter: "FIXED", align: "CENTER", fill: C.white, shadow: SHADOW_E1
      });
      a.appendChild(text(mot, { font: FONT_LB, size: 12, color: C.ink }));
      return a;
    }

    function lot(nom, node) { return composant(nom, node); }

    // ============================================================
    //                        LE CATALOGUE
    // ============================================================

    categorie("Boutons");
    jeu("Button", [
      ["Style=Primary",   bouton("Action", "primary")],
      ["Style=Secondary", bouton("Action", "secondary")],
      ["Style=Ghost",     bouton("Action", "ghost")],
      ["Style=Danger",    bouton("Action", "danger")],
      ["Style=Disabled",  bouton("Action", "disabled")]
    ]);
    jeu("Button / Icon", [
      ["Type=Retour", boutonRetour("<")],
      ["Type=Fermer", boutonRetour("X")]
    ]);

    categorie("Champs de formulaire");
    lot("Field / Text", champTexteSimple("Nom", "Perceuse Bosch"));
    lot("Field / Select", champSelect("Pièce", "Garage"));
    lot("Field / Search", (function () {
      const f = frame("Field/Search", { dir: "VERTICAL", w: 353, counter: "FIXED" });
      addFill(f, champRecherche("Rechercher un objet..."));
      return f;
    })());
    lot("Field / Textarea", champTexte("Note", "Les mèches sont dans la boîte bleue.", 88));
    jeu("Field / Toggle", [
      ["État=On",  ligneToggle("Prévenir Thomas", "Il reçoit une notification", true)],
      ["État=Off", ligneToggle("Prévenir Thomas", "Il reçoit une notification", false)]
    ]);
    lot("Field / Upload photo", zoneUpload());
    lot("Jauge d'étapes", jaugeEtapes(1));

    categorie("Chips et filtres");
    jeu("Chip / Filter", [
      ["État=Sélectionné",     chip("Hauts", true, false)],
      ["État=Non sélectionné", chip("Hauts", false, false)]
    ]);
    lot("Chip / Sort", (function () {
      const c = frame("Chip/Sort", {
        dir: "HORIZONTAL", gap: S.xs, radius: R.full, px: S.md, h: 32,
        counter: "FIXED", align: "CENTER", fill: C.ink, fillOpacity: 0.05
      });
      c.appendChild(text("Trier : récemment ajouté", { size: 12, color: C.sub }));
      c.appendChild(text("v", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
      return c;
    })());
    lot("Garment / Attribute", attribut("Taille M"));

    categorie("Statuts");
    // Les 8 etats metier (lot 21) : « Deplace » est une action, pas un etat.
    jeu("Status / Object", ETATS_OBJET.map(function (e) {
      return ["Statut=" + e[0], statusPill(e[0], e[1])];
    }));
    jeu("Status / Loan", [
      ["Statut=En cours",  statusPill("En cours", "encours")],
      ["Statut=À rendre",  statusPill("À rendre", "arendre")],
      ["Statut=En retard", statusPill("En retard", "retard")],
      ["Statut=Terminé",   statusPill("Terminé", "termine")]
    ]);

    categorie("Cartes");
    lot("Card / Object", carteListe("Perceuse Bosch", "Maison › Garage › Étagère 2",
      "Disponible", "dispo", PIC.pants, "Card/Object"));
    lot("Card / Garment", carteVetement("T-shirt Nike", "Nike · Hauts · M", null, null, PIC.tshirt));
    lot("Card / Loan", carteListe("Perceuse Bosch", "Prêtée à Thomas · retour 20 sept.",
      "En cours", "encours", PIC.pants, "Card/Loan"));
    lot("Card / Listing", carteVetement("Veste en cuir", "45 €", "En vente", "vente", PIC.jacket));
    lot("Card / Friend", rangeeAmi("Thomas", "2 prêts en cours", 0, statusPill("Ami", "encours")));
    lot("Card / Place", cartePlace("Garage", "3 rangements · 34 objets"));
    lot("Card / Outfit", carteOutfit());
    // lot 23 : carte de collection, la couverture est une composition
    lot("Card / Collection", carteCollection("Mon style — été 2026", "12 éléments",
      [PIC.jacket, PIC.baskets, PIC.tshirt], "Privée", "neutre", 176));
    // lot 27 : publication du fil (audience toujours visible, pas de « j'aime »)
    lot("Card / Post", (function () {
      const f = frame("Card/Post", { dir: "VERTICAL", w: 353, counter: "FIXED" });
      addFill(f, cartePost("Rafael", 2, "il y a 2 h", "Amis autorisés", "encours",
        "Ma collection pour cet été est prête. Vos avis ?", null, "Commenter (3)", "Voir la collection ›"));
      return f;
    })());

    categorie("Listes et fiches");
    lot("List / Row", lienRangee("Mes informations", "Nom, e-mail, mot de passe"));
    lot("List / Section header", (function () {
      const f = frame("List/Section header", { dir: "VERTICAL", w: 353, counter: "FIXED" });
      addFill(f, enteteSection("Derniers ajouts", "Tout voir"));
      return f;
    })());
    lot("Detail / Info row", (function () {
      const f = frame("Detail/Info row", {
        dir: "VERTICAL", w: 353, radius: R.md, fill: C.white, px: S.lg, py: S.lg,
        shadow: SHADOW_E1, counter: "FIXED"
      });
      addFill(f, ligneInfo("Retour prévu", "20 sept. 2026"));
      return f;
    })());
    lot("Detail / Action bar", (function () {
      const f = frame("Detail/Action bar", { dir: "VERTICAL", gap: S.md, w: 353, counter: "FIXED" });
      addFill(f, bouton("Prêter", "primary"));
      const row = frame("Secondaires", { dir: "HORIZONTAL", gap: S.md });
      addFill(row, bouton("Modifier", "secondary"));
      addFill(row, bouton("Vendre", "secondary"));
      addFill(f, row);
      const d = frame("Destructif", { dir: "HORIZONTAL", justify: "CENTER" });
      d.appendChild(text("Supprimer cet objet", { font: FONT_LB, size: 12, color: C.error }));
      addFill(f, d);
      return f;
    })());

    categorie("Navigation");
    lot("Nav", construireNav("Accueil"));
    lot("Nav / Breadcrumb", filAriane());

    categorie("Notifications et retours");
    lot("Toast / Succès", (function () {
      const f = frame("Toast/Succès", { dir: "VERTICAL", w: 353, counter: "FIXED" });
      addFill(f, toastSucces("Objet ajouté !", "129 objets dans ta penderie."));
      return f;
    })());
    lot("Toast / Erreur", (function () {
      const f = frame("Toast/Erreur", { dir: "VERTICAL", w: 353, counter: "FIXED" });
      addFill(f, toastInfo("Paiement refusé", "Ta banque a refusé l'opération.", C.error));
      return f;
    })());
    lot("Toast / Info", (function () {
      const f = frame("Toast/Info", { dir: "VERTICAL", w: 353, counter: "FIXED" });
      addFill(f, toastInfo("Remboursement en cours", "Ta demande a été acceptée.", C.primary));
      return f;
    })());
    jeu("Notification / Row", [
      ["État=Non lu", notification("Prêt en retard", "La tondeuse devait revenir le 5 septembre.", "retard", true)],
      ["État=Lu",     notification("Paiement reçu", "Julie t'a payé 35 €.", "encours", false)]
    ]);

    categorie("Profil");
    jeu("Avatar", [
      ["Taille=S", (function () { const f = frame("Avatar", { dir: "VERTICAL" }); f.appendChild(avatar("Thomas", 0, 32)); return f; })()],
      ["Taille=M", (function () { const f = frame("Avatar", { dir: "VERTICAL" }); f.appendChild(avatar("Thomas", 0, 48)); return f; })()],
      ["Taille=L", (function () { const f = frame("Avatar", { dir: "VERTICAL" }); f.appendChild(avatar("Thomas", 0, 88)); return f; })()]
    ]);

    categorie("Modales et états");
    lot("Modal / Confirm", modaleConfirm());
    lot("Empty state", etatVideCompose());
    lot("Loader / Skeleton carte", squelette());

    retourLigne();
    const resume = NB + " composants poses sur la page « " + PAGE.name + " »"
      + (efface ? " (" + efface + " element(s) du catalogue precedent remplaces)" : "");
    console.log(resume);
    figma.notify("Catalogue DS v2 : " + resume, { timeout: 8000 });
    figma.viewport.scrollAndZoomIntoView(
      PAGE.children.filter(function (n) {
        try { return n.getPluginData("penderie-catalogue") === "1"; } catch (e) { return false; }
      })
    );

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
