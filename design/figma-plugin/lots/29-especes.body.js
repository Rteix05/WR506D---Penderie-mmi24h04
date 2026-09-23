// ============================================================
// Lot 29 — PAIEMENT EN ESPÈCES  (page « Maquette v2 », section 11)
//
// Décision client du 21 septembre : la vente entre dans le MVP avec DEUX
// parcours — paiement en ligne, ou espèces à la remise. Le second n'était
// dessiné nulle part : le lot 09 ne connaît que la carte bancaire, et
// « Livraison — Remise en main propre » affiche « Thomas est payé à ce
// moment-là », donc un paiement en ligne suivi d'un retrait.
//
// 3 écrans NOUVEAUX (ecranNouveau : créés au 1er passage, retrouvés par
// leur nom ensuite — relançable sans doublon) :
//   1. Paiement — Mode de paiement              le choix, et ce qu'il coûte
//   2. Livraison — Remise · Paiement en espèces la double confirmation
//   3. Paiement — Remise confirmée · Espèces    la clôture, sans versement
//
// Le 3e écran existe parce que « Vente — État · Commande terminée » dit
// « Thomas a reçu les 45 € » et « Versement : effectué » : vrai du parcours
// en ligne, faux de l'espèce, où aucun argent ne transite par Penderie.
//
// Libellés cliquables attendus par penderie-prototype-v2.js :
// « Continuer », « En espèces à la remise », « J'ai reçu l'objet »,
// « Signaler un problème », « Voir mes achats ».
// Commande de référence : #PND-2481, 45 € en espèces, aucun frais.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 29 Paiement en especes : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();

    async function comp(id) {
      try {
        const n = await figma.getNodeByIdAsync(id);
        return (n && n.type === "COMPONENT") ? n : null;
      } catch (e) { return null; }
    }
    const PIC = { jacket: await comp("39:55") };

    const SECTION = "PAIEMENT";
    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;
    const ART = "Veste en cuir";
    const CMD = "Commande #PND-2481";

    // ---------- briques (reprises du lot 09, mêmes corps) ----------

    function carteElement(nom, meta, pic, pastille, tone) {
      const c = card("Card/Section/Element", { gap: S.md });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      l.appendChild(photoBox(56, 56, R.sm, pic, C.ink));
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para(meta, 170, { size: 12, color: C.sub, lineHeight: 16 }));
      l.appendChild(g);
      if (pastille) l.appendChild(statusPill(pastille, tone));
      addFill(c, l);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return c;
    }

    function carteTotal(lignes, total, libelleTotal) {
      const c = card("Checkout/Line", { gap: S.md });
      c.appendChild(text("Total", { font: FONT_LB, size: 12, color: C.sub }));
      for (let i = 0; i < lignes.length; i++) {
        const l = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
        l.appendChild(text(lignes[i][0], { size: 16, color: C.sub }));
        l.appendChild(text(lignes[i][1], { size: 16, color: C.ink }));
        addFill(c, l);
      }
      const sep = figma.createRectangle();
      sep.name = "Separateur";
      sep.resize(UTIL_CARTE, 1);
      sep.fills = solid(C.ink, 0.08);
      c.appendChild(sep);
      const t = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
      t.appendChild(text(libelleTotal || "À payer", { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(text(total, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      addFill(c, t);
      return c;
    }

    function ligneChoix(label, meta, choisi) {
      const droite = choisi ? statusPill("Choisi", "arendre")
                            : text("›", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 });
      const r = frame("List/Row/" + label, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.lg, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(label, { font: FONT_LB, size: 16, color: C.ink }));
      if (meta) g.appendChild(para(meta, 220, { size: 12, color: C.sub, lineHeight: 16 }));
      r.appendChild(g);
      r.appendChild(droite);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    // ---------- briques propres aux espèces ----------

    // Encadré d'avertissement : liste à puces sur aplat teinté. Le ton
    // « primary » sert quand la conséquence est une contrainte assumée,
    // « error » quand elle est une perte de garantie.
    function encadre(titre, lignes, ton) {
      const coul = ton === "error" ? C.error : C.primary;
      const c = card("Card/Section/" + titre, {
        gap: S.sm, fill: coul, fillOpacity: 0.07, shadow: null
      });
      c.appendChild(text(titre, { font: FONT_LB, size: 12, color: ton === "error" ? C.errorTexte : C.primaryTexte }));
      for (let i = 0; i < lignes.length; i++) {
        const l = frame("Puce", { dir: "HORIZONTAL", gap: S.sm, align: "MIN" });
        l.appendChild(text("•", { font: FONT_LB, size: 16, color: coul }));
        l.appendChild(para(lignes[i], UTIL_CARTE - 20, { size: 16, color: C.ink, lineHeight: 22 }));
        addFill(c, l);
      }
      return c;
    }

    // Une voix de la double confirmation : qui doit confirmer, où il en
    // est. L'avatar porte l'identité, la pastille porte l'état — on lit
    // « qui manque » sans lire les libellés.
    function rangeeConfirmation(nom, meta, etat, tone, i) {
      const r = frame("Card/Confirm/" + nom, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      g.appendChild(avatar(nom, i, 48));
      const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
      t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(para(meta, 180, { size: 12, color: C.sub, lineHeight: 16 }));
      g.appendChild(t);
      r.appendChild(g);
      r.appendChild(statusPill(etat, tone));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    // ============ 1. Mode de paiement ============
    // Le choix est posé AVANT la commande, parce qu'il la contraint :
    // en espèces, la remise en main propre devient obligatoire et le
    // remboursement disparaît. Le dire ici, pas après.
    ecranNouveau(SECTION, "Paiement — Mode de paiement", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Comment tu paies ?", ART + " · Thomas"));

      const moyens = frame("Section/Moyens", { dir: "VERTICAL", gap: S.md });
      addFill(moyens, enteteSection("Moyen de paiement", null));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, ligneChoix("En ligne · carte bancaire",
        "Penderie garde les 45 € et les verse à Thomas quand tu as reçu l'article", true));
      addFill(l, ligneChoix("En espèces à la remise",
        "De la main à la main, le jour du rendez-vous", false));
      addFill(moyens, l);
      addFill(col, moyens);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, encadre("Ce que l'espèce change", [
        "La remise en main propre devient obligatoire : pas d'envoi.",
        "Vous confirmez la remise tous les deux dans l'application.",
        "Penderie ne voit pas cet argent et ne peut rien rembourser."
      ], "error"));
      addFill(blocs, carteTotal([["Article", "45 €"], ["Remise en main propre", "0 €"]], "45 €", "À prévoir"));
      addFill(col, blocs);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Le mode de paiement est figé à la création de la commande.");
      finaliser(screen, col);
    });

    // ============ 2. Remise · Paiement en espèces ============
    // Aucune trace bancaire : les deux confirmations horodatées sont la
    // seule preuve. L'écran montre donc les DEUX voix, pas seulement la
    // sienne — sinon on ne sait pas ce qu'on attend.
    ecranNouveau(SECTION, "Livraison — Remise · Paiement en espèces", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Remise en espèces", ART + " · Thomas"));

      const el = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(el, carteElement(ART, "Acheté à Thomas · 45 €", PIC.jacket, "À remettre", "arendre"));
      addFill(el, carteSection("Le rendez-vous", [
        ligneInfo("Quand", "Samedi 14 sept. · 15 h"),
        ligneInfo("Où", "Métro Père-Lachaise"),
        ligneInfo("À prévoir", "45 € en espèces")
      ]));
      addFill(col, el);

      const conf = frame("Section/Confirmations", { dir: "VERTICAL", gap: S.md });
      addFill(conf, enteteSection("Les deux confirmations", null));
      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, rangeeConfirmation("Thomas", "A confirmé avoir été payé · 15 h 12", "Confirmé", "dispo", 0));
      addFill(liste, rangeeConfirmation("Toi", "Confirme une fois l'article entre tes mains", "En attente", "arendre", 1));
      addFill(conf, liste);
      addFill(col, conf);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, encadre("Pourquoi deux confirmations", [
        "L'argent ne passe pas par Penderie : rien ne prouve la vente à notre place.",
        "La commande reste ouverte tant que l'un de vous n'a pas confirmé."
      ], "primary"));
      addFill(col, blocs);

      barreActions(col,
        bouton("J'ai reçu l'objet", "primary"),
        [bouton("Contacter Thomas", "secondary")],
        "Signaler un problème",
        "Ne confirme qu'une fois l'article entre tes mains : la vente se clôt à ce moment-là.");
      finaliser(screen, col);
    });

    // ============ 3. Remise confirmée · Espèces ============
    // La clôture du parcours B. « Commande terminée » du lot 08 ne peut
    // pas servir : elle annonce un versement effectué par la plateforme.
    ecranNouveau(SECTION, "Paiement — Remise confirmée · Espèces", 2, function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Vente clôturée", "Vous avez confirmé tous les deux."));
      addFill(col, z);

      addFill(col, titrePage("45 € en espèces", CMD));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement(ART, "Acheté à Thomas", PIC.jacket, "Terminée", "termine"));
      addFill(blocs, carteSection("La remise", [
        ligneInfo("Montant", "45 € en espèces"),
        ligneInfo("Remis le", "14 sept. 2026 · 15 h 14"),
        ligneInfo("Confirmée par", "Thomas et toi")
      ]));
      addFill(blocs, encadre("Aucun versement à attendre", [
        "Thomas a été payé directement : Penderie n'a encaissé ni versé quoi que ce soit.",
        "Un remboursement par l'application est impossible sur une vente en espèces."
      ], "primary"));
      addFill(col, blocs);

      barreActions(col,
        bouton("Voir mes achats", "primary"),
        [bouton("Noter Thomas", "secondary")], null, null);
      finaliser(screen, col);
    });

    rapport("Lot 29 Paiement en especes");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
