// ============================================================
// Lot 03 — DRESSING  (page "Maquette v2", section 05)
//
// 10 ecrans refaits. Le noeud frame est conserve a chaque fois,
// donc les reactions de prototype de niveau frame survivent.
// Aucun contenu ni action retire : seule la composition change.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 03 Dressing : demarrage...", { timeout: 1500 });
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
      cintre:  await comp("52:2024")
    };
    // poserFAB / poserNav viennent de la lib.

    // ---------- briques propres au dressing ----------

    // Carte vetement : texte minimal, photo dominante. C'est ce qui la
    // distingue de la carte objet, qui porte plus d'infos de gestion.
    function carteVetement(v, largeur, ratio) {
      const nom = v[0], marque = v[1], porte = v[2], statut = v[3], tone = v[4], pic = v[5];
      const c = frame("Card/Garment/" + nom, {
        dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
        shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
      });
      const ph = photoBox(largeur, Math.round(largeur * ratio), 0, pic, C.ink);
      c.appendChild(ph);
      if (statut) overlay(ph, statusPill(statut, tone, true), S.sm, S.sm);

      const util = largeur - S.md * 2;
      const b = frame("Texte", { dir: "VERTICAL", gap: 2, px: S.md, pt: S.md, pb: S.md });
      b.appendChild(para(nom, util, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
      b.appendChild(para(marque, util, { size: 12, color: C.sub }));
      if (porte) b.appendChild(para(porte, util, { size: 12, color: C.sub, opacity: 0.85 }));
      addFill(c, b);
      return c;
    }

    // Deux colonnes DECALEES : les hauteurs de photo alternent, ce qui
    // casse l'effet catalogue et donne envie de faire defiler.
    function grilleDressing(items) {
      const largeur = Math.floor((W - GUT * 2 - S.md) / 2);
      const g = frame("Grille", { dir: "HORIZONTAL", gap: S.md, px: GUT, align: "MIN" });
      const colA = frame("Colonne A", { dir: "VERTICAL", gap: S.md });
      const colB = frame("Colonne B", { dir: "VERTICAL", gap: S.md });
      const ratios = [1.35, 1.0, 1.0, 1.35, 1.35, 1.0, 1.0, 1.35];
      for (let i = 0; i < items.length; i++) {
        const cible = (i % 2 === 0) ? colA : colB;
        cible.appendChild(carteVetement(items[i], largeur, ratios[i % ratios.length]));
      }
      g.appendChild(colA);
      g.appendChild(colB);
      try {
        colA.layoutSizingHorizontal = "FILL";
        colB.layoutSizingHorizontal = "FILL";
      } catch (e) {}
      return g;
    }

    function chipTri(label, avecChevron) {
      const c = frame("Chip/Sort/" + label, {
        dir: "HORIZONTAL", gap: S.xs, radius: R.full, px: S.md, h: 32,
        counter: "FIXED", align: "CENTER", fill: C.ink, fillOpacity: 0.05
      });
      c.appendChild(text(label, { size: 12, color: C.sub }));
      if (avecChevron) c.appendChild(text("v", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
      return c;
    }

    const VETEMENTS = [
      ["T-shirt Nike",     "Nike · Hauts · M",         "Porté il y a 3 j",    null,     null,    PIC.tshirt],
      ["Veste en jean",    "Levi's · Vestes · L",      null,                  "Prêtée", "prete", PIC.jacket],
      ["Pantalon noir",    "Zara · Pantalons · 40",    "Porte hier",          null,     null,    PIC.pants],
      ["Baskets Adidas",   "Adidas · Chaussures · 42", null,                  "35 EUR", "vente", PIC.baskets],
      ["Casquette NY",     "New Era · Accessoires",    "Porté il y a 2 sem.", null,     null,    PIC.cap],
      ["Écharpe en laine", "Uniqlo · Accessoires",     "Jamais porté",        null,     null,    PIC.scarf]
    ];
    const CATEGORIES = ["Tous", "Hauts", "Pantalons", "Chaussures", "Vestes", "Accessoires"];

    // ============ 1. Dressing ============
    ecran("Vêtement — Dressing", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mon dressing", "48 vêtements · 1 prêté · 1 en vente"));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher un vêtement, une marque..."));
      addFill(col, rech);

      const filtres = frame("Filtres", { dir: "VERTICAL", gap: S.md });
      addFill(filtres, rangeeChips(CATEGORIES, 0));
      const tri = frame("Tri", { dir: "HORIZONTAL", gap: S.sm, px: GUT, justify: "SPACE_BETWEEN", align: "CENTER" });
      tri.appendChild(chipTri("Filtres", false));
      tri.appendChild(chipTri("Trier : récemment ajouté", true));
      addFill(filtres, tri);
      addFill(col, filtres);

      addFill(col, grilleDressing(VETEMENTS));
      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 2. Catégorie · Hauts ============
    ecran("Vêtement — Catégorie · Hauts", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Hauts", "12 vêtements"));

      const filtres = frame("Filtres", { dir: "VERTICAL", gap: S.md });
      addFill(filtres, rangeeChips(CATEGORIES, 1));
      addFill(col, filtres);

      addFill(col, grilleDressing([
        ["T-shirt Nike",    "Nike · Hauts · M",    "Porté il y a 3 j", null,     null,    PIC.tshirt],
        ["Chemise blanche", "Uniqlo · Hauts · M",  "Porté le 2 sept.", null,     null,    PIC.tshirt],
        ["Pull col rond",   "COS · Hauts · L",     "Jamais porté",     null,     null,    PIC.coat],
        ["Veste en jean",   "Levi's · Vestes · L", null,               "Prêtée", "prete", PIC.jacket]
      ]));
      finaliser(screen, col);
      poserFAB(screen);
    });

    // ============ 3. Filtrer ============
    ecran("Vêtement — Filtrer", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Filtres", "3 filtres actifs · 12 vêtements trouvés"));

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Catégorie", "Hauts"));
      addFill(champs, champSelect("Marque", "Toutes les marques"));
      addFill(champs, groupeChips("Taille", ["XS", "S", "M", "L", "XL", "XXL", "Autre"], ["M"]));
      addFill(champs, champSelect("Couleur", "Toutes les couleurs"));
      addFill(champs, groupeChips("Usage", ["Travail", "Quotidien", "Sport", "Soirée", "Événement", "Maison"], ["Quotidien"]));
      addFill(champs, groupeChips("État", ["Neuf", "Très bon état", "Bon état", "Usé"], ["Très bon état"]));
      addFill(col, champs);

      const actions = frame("Detail/Action bar", { dir: "HORIZONTAL", gap: S.md, px: GUT });
      addFill(actions, bouton("Réinitialiser", "secondary"));
      addFill(actions, bouton("Appliquer", "primary"));
      addFill(col, actions);
      finaliser(screen, col);
    });

    // ============ fiches vetement ============
    function heroVetement(col, nom, marque, statut, tone, pic) {
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
      overlay(hero, boutonRetour("X"), GUT, S.xl);

      const tete = frame("Titre", { dir: "VERTICAL", gap: S.sm, px: GUT });
      const ligne = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(nom, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      g.appendChild(text(marque, { size: 12, color: C.sub }));
      ligne.appendChild(g);
      if (statut) ligne.appendChild(statusPill(statut, tone));
      addFill(tete, ligne);
      addFill(col, tete);
    }

    // Les attributs deviennent des puces : plus lisibles d'un coup d'oeil
    // qu'une pile de lignes « Label : valeur ».
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

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;

    function blocLocalisation(titre, chemin, lien) {
      const c = card("Card/Section/Localisation", { gap: S.sm });
      c.appendChild(text(titre, { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(chemin, UTIL_CARTE, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      if (lien) c.appendChild(text(lien, { size: 12, color: C.primary }));
      return c;
    }

    function blocHistorique(resume, lien) {
      const c = card("Card/Section/Historique", { gap: S.sm });
      c.appendChild(text("Historique de port", { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(resume, UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      if (lien) c.appendChild(text(lien, { size: 12, color: C.primary }));
      return c;
    }

    const ATTRS = ["Taille M", "Noir", "Quotidien · Sport", "Très bon état"];
    const LOC_TSHIRT = "Maison principale › Chambre › Armoire › Étagère 2";
    const HIST_TSHIRT = "Porté 12 fois · dernière fois le 8 septembre";

    ecran("Vêtement — Fiche complète", function (screen) {
      const col = preparer(screen, 40, 0);
      heroVetement(col, "T-shirt Nike", "Nike", "Dans ma penderie", "penderie", PIC.tshirt);
      addFill(col, attributs(ATTRS));
      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_TSHIRT, "Déplacer le vêtement ›"));
      addFill(blocs, blocHistorique(HIST_TSHIRT, "Voir l'historique ›"));
      addFill(col, blocs);
      barreActions(col,
        bouton("Modifier", "primary"),
        [bouton("Déplacer", "secondary"), bouton("Prêter", "secondary"), bouton("Vendre", "secondary")],
        "Supprimer ce vêtement", null);
      finaliser(screen, col);
    });

    ecran("Vêtement — Fiche · Prêté", function (screen) {
      const col = preparer(screen, 40, 0);
      heroVetement(col, "T-shirt Nike", "Nike", "Prêté à Thomas", "prete", PIC.tshirt);
      addFill(col, attributs(ATTRS));
      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const pret = card("Card/Section/Pret en cours", { gap: S.sm });
      pret.appendChild(text("Localisation actuelle", { font: FONT_LB, size: 12, color: C.sub }));
      pret.appendChild(para("Chez Thomas · retour prévu le 20 septembre", UTIL_CARTE,
        { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      pret.appendChild(para("Rangement habituel : Chambre › Armoire › Étagère 2", UTIL_CARTE,
        { size: 12, color: C.sub }));
      addFill(blocs, pret);
      addFill(blocs, blocHistorique(HIST_TSHIRT, "Voir l'historique ›"));
      addFill(col, blocs);
      // « Preter » et « Vendre » restent indisponibles : regle metier conservee
      barreActions(col,
        bouton("Récupéré", "primary"),
        [bouton("Rappeler", "secondary")],
        null, "Prêt et vente indisponibles tant qu'il est prêté.");
      finaliser(screen, col);
    });

    ecran("Vêtement — Fiche · En vente", function (screen) {
      const col = preparer(screen, 40, 0);
      heroVetement(col, "T-shirt Nike", "Nike", "En vente · 20 EUR", "vente", PIC.tshirt);
      addFill(col, attributs(ATTRS));
      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_TSHIRT, "Déplacer le vêtement ›"));
      addFill(blocs, blocHistorique(HIST_TSHIRT, "Voir l'historique ›"));
      addFill(col, blocs);
      barreActions(col,
        bouton("Modifier", "primary"),
        [bouton("Retirer de la vente", "secondary")],
        "Supprimer ce vêtement", null);
      finaliser(screen, col);
    });

    // ============ Historique de port ============
    ecran("Vêtement — Historique de port", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Historique de port", "T-shirt Nike · porté 12 fois"));

      const derniere = frame("Dernière", { dir: "VERTICAL", px: GUT });
      const d = card("Card/Section/Dernière fois", { gap: S.xs });
      d.appendChild(text("Dernière fois", { font: FONT_LB, size: 12, color: C.sub }));
      d.appendChild(text("Lundi 8 septembre", { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      d.appendChild(text("il y a 3 jours", { size: 12, color: C.sub }));
      addFill(derniere, d);
      addFill(col, derniere);

      const sec = frame("Section/Dernières fois", { dir: "VERTICAL", gap: S.md });
      const h = frame("Entete", { dir: "HORIZONTAL", px: GUT, justify: "SPACE_BETWEEN", align: "CENTER" });
      h.appendChild(text("Dernières fois", { font: FONT_LB, size: 16, color: C.ink }));
      h.appendChild(text("Tout voir", { size: 12, color: C.primary }));
      addFill(sec, h);

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      const sorties = [
        ["Soirée entre amis", "Tenue avec Veste en jean",  "8 sept.", PIC.jacket],
        ["Journée au bureau", "Tenue avec Pantalon noir",  "2 sept.", PIC.pants],
        ["Week-end à Troyes", "Tenue avec Baskets Adidas", "25 août", PIC.baskets],
        ["Match de foot",     "Tenue avec Casquette NY",   "18 août", PIC.cap]
      ];
      for (let i = 0; i < sorties.length; i++) {
        const s = sorties[i];
        const row = frame("Detail/History item/" + s[0], {
          dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
          px: S.md, py: S.md, align: "CENTER", shadow: SHADOW_E1
        });
        row.appendChild(photoBox(48, 48, R.sm, s[3], C.ink));
        const b = frame("Texte", { dir: "VERTICAL", gap: 2 });
        b.appendChild(text(s[0], { font: FONT_LB, size: 16, color: C.ink }));
        b.appendChild(text(s[1], { size: 12, color: C.sub }));
        row.appendChild(b);
        row.appendChild(text(s[2], { size: 12, color: C.sub, opacity: 0.85 }));
        addFill(liste, row);
        try { b.layoutSizingHorizontal = "FILL"; } catch (e) {}
      }
      addFill(sec, liste);
      addFill(col, sec);

      const lien = frame("Lien", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      lien.appendChild(text("Voir tout l'historique ›", { size: 12, color: C.primary }));
      addFill(col, lien);

      const actions = frame("Detail/Action bar", { dir: "VERTICAL", px: GUT });
      addFill(actions, bouton("Je le porte aujourd'hui", "primary"));
      addFill(col, actions);
      finaliser(screen, col);
    });

    // ============ etats vides ============
    // Structure unique pour les trois : ils etaient composes differemment
    // les uns des autres dans la version precedente.
    function etatVide(screen, sousTitre, titre, corps, action, avecFAB) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Mon dressing", sousTitre));

      const bloc = frame("Empty state", {
        dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER", justify: "CENTER"
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
      txt.appendChild(para(titre, W - GUT * 2,
        { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      txt.appendChild(para(corps, W - GUT * 2 - S.xl,
        { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bloc, txt);

      if (action) {
        const a = frame("Action", { dir: "VERTICAL", pt: S.sm });
        a.appendChild(bouton(action, "primary"));
        bloc.appendChild(a);
      }
      addFill(col, bloc);
      finaliser(screen, col);
      if (avecFAB) poserFAB(screen);
    }

    ecran("Vêtement — État · Dressing vide", function (screen) {
      etatVide(screen, "0 vêtement", "Ton dressing est vide",
        "Ajoute ton premier vêtement : il apparaîtra ici avec sa photo, sa marque et sa catégorie.",
        "Ajouter un vêtement", true);
    });

    ecran("Vêtement — État · Aucun résultat (recherche)", function (screen) {
      etatVide(screen, "Aucun résultat", "Aucun vêtement trouvé",
        "Aucun vêtement ne correspond à ta recherche. Vérifie l'orthographe ou essaie un autre mot.",
        "Effacer la recherche", false);
    });

    ecran("Vêtement — État · Aucun résultat (filtre)", function (screen) {
      etatVide(screen, "3 filtres actifs", "Aucun vêtement avec ces filtres",
        "Aucun vêtement ne correspond aux filtres sélectionnés. Élargis ta sélection pour voir plus de résultats.",
        "Réinitialiser les filtres", false);
    });

    rapport("Lot 03 Dressing");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
