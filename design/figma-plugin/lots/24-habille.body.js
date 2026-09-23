// ============================================================
// Lot 24 — « L'APPLICATION M'HABILLE »
// (page "Maquette v2", sections 06 SUGGESTIONS DE TENUES et 05 DRESSING)
//
// Audit du brief avant construction (points 3 à 7) :
//   [COUVERT] météo et contexte ; historique de port ; éviter le porté récent
//   [PARTIEL] pourquoi la tenue est proposée ; « déjà porté cette semaine » ;
//             refuser OU remplacer une pièce ; style à choix unique
//             -> lots 04, 14 et 03 adaptés
//   [MANQUANT] retour « cette pièce ne sera plus proposée » ; exclusions
//             réactivables ; réinitialisation ; catégories de style en
//             familles                                   -> 5 NOUVEAUX
//
// CORRECTION de la contradiction de l'audit (lot 04, Préférences) :
//   avant  « Elles ne reviendront pas avant 30 jours »
//   après  « Ne sont plus proposées jusqu'à ce que tu les réactives »
//
// Le moteur n'est pas une boîte noire : chaque suggestion dit ses raisons
// (température, contexte, porté récemment, compatibilité), et chaque refus
// se défait depuis « Mes exclusions ». Aucune décision n'est irréversible.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 24 L'app m'habille : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    const P = await chargerPics();

    const TENUES = "TENUES";
    const DRESSING = "DRESSING";

    function blocs(col, noeuds) {
      const b = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < noeuds.length; i++) if (noeuds[i]) addFill(b, noeuds[i]);
      addFill(col, b);
    }

    function mosaique(pieces, hauteur) {
      const gL = Math.floor((UTIL - S.md) * 0.58);
      const gR = UTIL - S.md - gL;
      const hp = Math.floor((hauteur - S.md) / 2);
      const m = frame("Mosaique", { dir: "HORIZONTAL", gap: S.md, align: "MIN" });
      m.appendChild(photoBox(gL, hauteur, R.lg, pieces[0], C.ink));
      const d = frame("Colonne", { dir: "VERTICAL", gap: S.md });
      d.appendChild(photoBox(gR, hp, R.md, pieces[1], C.ink));
      d.appendChild(photoBox(gR, hauteur - S.md - hp, R.md, pieces[2], C.ink));
      m.appendChild(d);
      const b = frame("Composition", { dir: "VERTICAL", px: GUT });
      addFill(b, m);
      return b;
    }

    // Une exclusion : ce qui est évité, depuis quand, et la sortie
    function exclusion(nom, meta, pic) {
      const r = frame("List/Row/" + nom, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      if (pic !== undefined) g.appendChild(photoBox(48, 48, R.sm, pic, C.ink));
      const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
      t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(para(meta, 170, { size: 12, color: C.sub, lineHeight: 16 }));
      g.appendChild(t);
      r.appendChild(g);
      r.appendChild(text("Réactiver", { font: FONT_LB, size: 12, color: C.primary }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    function liste(col, titre, lien, rangees) {
      const sec = frame("Section/" + titre, { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection(titre, lien));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < rangees.length; i++) addFill(l, rangees[i]);
      addFill(sec, l);
      addFill(col, sec);
    }

    // ============ 1. Pièce refusée ============
    ecranNouveau(TENUES, "Tenue — Pièce refusée", 0, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastInfo("Cette pièce ne sera plus proposée", "T-shirt Nike · tu peux la réactiver dans tes préférences.", C.sub)]);
      addFill(col, titrePage("Ta tenue", "Travail · 12° nuageux · 1 pièce remplacée"));
      addFill(col, mosaique([P.jacket, P.tshirt, P.pants], 240));
      liste(col, "Remplacée par", null, [
        carteElement("Chemise blanche", "Uniqlo · Hauts · Smart casual · pas portée cette semaine", P.tshirt, "Nouveau", "arendre"),
        carteElement("T-shirt Nike", "Refusé : exclu des prochaines suggestions", P.tshirt, "Exclu", "neutre")
      ]);
      const lien = frame("Lien", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      lien.appendChild(text("Annuler le refus", { font: FONT_LB, size: 16, color: C.primary }));
      addFill(col, lien);
      barreActions(col, bouton("J'aime cette tenue", "primary"),
        [bouton("Voir mes exclusions", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 2. Mes exclusions ============
    ecranNouveau(TENUES, "Tenue — Préférences · Mes exclusions", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes exclusions", "Ce que la suggestion évite · tout se réactive"));
      liste(col, "Pièces refusées", "2", [
        exclusion("T-shirt Nike", "Refusé le 12 sept. · « Je n'aime pas »", P.tshirt),
        exclusion("Pull col rond", "Refusé le 30 août", P.coat)
      ]);
      liste(col, "Couleurs", "1", [exclusion("Rouge", "« Je n'aime pas le rouge » · depuis le 3 sept.")]);
      liste(col, "Styles", "1", [exclusion("Streetwear", "Jamais pour le contexte Travail · depuis le 1er sept.")]);
      liste(col, "Contextes", "1", [exclusion("Soirée", "Désactivé : aucune suggestion de soirée")]);
      barreActions(col, bouton("Terminé", "primary"), null, "Tout réinitialiser",
        "Une exclusion dure jusqu'à ce que tu la réactives.");
      finaliser(screen, col);
    });

    // ============ 3. Préférence réactivée ============
    ecranNouveau(TENUES, "Tenue — Préférence réactivée", 2, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("T-shirt Nike réactivé !", "Il peut de nouveau être proposé dès demain.")]);
      addFill(col, titrePage("Mes exclusions", "1 pièce · 1 couleur · 1 style · 1 contexte"));
      const lien = frame("Lien", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      lien.appendChild(text("Annuler la réactivation", { font: FONT_LB, size: 16, color: C.primary }));
      addFill(col, lien);
      liste(col, "Pièces refusées", "1", [exclusion("Pull col rond", "Refusé le 30 août", P.coat)]);
      liste(col, "Couleurs", "1", [exclusion("Rouge", "« Je n'aime pas le rouge » · depuis le 3 sept.")]);
      liste(col, "Styles", "1", [exclusion("Streetwear", "Jamais pour le contexte Travail · depuis le 1er sept.")]);
      barreActions(col, bouton("Terminé", "primary"), null, "Tout réinitialiser", null);
      finaliser(screen, col);
    });

    // ============ 4. Réinitialiser (overlay) ============
    ecranNouveau(TENUES, "Tenue — Confirmation · Réinitialiser", 3, function (screen) {
      modale(screen,
        "Réinitialiser tes préférences ?",
        "Contextes, couleurs et styles reviennent aux réglages de départ. Les pièces refusées peuvent de nouveau être proposées.",
        "Réinitialiser",
        "Ton historique de port, tes tenues enregistrées et tes collections ne changent pas.",
        "primary");
    });

    // ============ 5. Catégories de style (référence) ============
    ecranNouveau(DRESSING, "Vêtement — Catégories de style", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Les catégories de style", "Ce qui guide les suggestions"));
      const familles = [
        ["Travail",   ["Professionnel", "Business", "Smart casual"], "Jamais avec : Sport, Maison"],
        ["Quotidien", ["Casual", "Streetwear", "Détente"],          "Jamais avec : Événement"],
        ["Sport",     ["Running", "Fitness", "Sport général"],      "Jamais avec : Travail, Soirée, Événement"],
        ["Soirée",    ["Chic", "Élégant"],                          "Jamais avec : Sport, Maison"],
        ["Événement", ["Cérémonie", "Mariage", "Formel"],           "Jamais avec : Sport, Maison"],
        ["Maison",    ["Maison", "Confort"],                        "Jamais avec : Travail, Événement"]
      ];
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < familles.length; i++) {
        const f = familles[i];
        const c = card("Card/Section/Style/" + f[0], { gap: S.sm });
        c.appendChild(text(f[0], { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
        const chips = frame("Chips", { dir: "HORIZONTAL", gap: S.sm, gapY: S.sm, wrap: true, primary: "FIXED" });
        for (let j = 0; j < f[1].length; j++) chips.appendChild(chip(f[1][j], false, true));
        addFill(c, chips);
        c.appendChild(para(f[2], UTIL_CARTE_LIB, { size: 12, color: C.sub, lineHeight: 16 }));
        addFill(l, c);
      }
      addFill(col, l);
      blocs(col, [bandeauPrive("Un vêtement peut appartenir à plusieurs catégories : un jean peut être Travail (smart casual) et Quotidien (casual).")]);
      barreActions(col, bouton("Compris", "primary"), null, null,
        "Contexte Travail : jamais de tenue de sport. Contexte Sport : jamais de costume.");
      finaliser(screen, col);
    });

    rapport("Lot 24 L'app m'habille");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
