// ============================================================
// Lot 09 — PAIEMENT / LIVRAISON  (page "Maquette v2", section 11)
//
// 12 ecrans refaits. Le noeud frame est conserve a chaque fois,
// donc les reactions de prototype de niveau frame survivent.
//
// Libelles cliquables attendus par penderie-prototype.js :
// « Continuer vers le paiement », « Payer 50 € », « Paiement confirme ! »,
// « Commande #PND-2481 », « Main propre · gratuit », « Continuer »,
// « Signaler un probleme », « Livree », « En transit », « J'ai recu »,
// « Incident de livraison », « Ventes », « Achats », « Veste en cuir »,
// « Baskets Nike », « T-shirt Nike », « Baskets Adidas », « Echarpe »,
// « Envoyer », « Remboursement termine », « Revenir a mes achats ».
// Commande de reference : #PND-2481, 45 € + 5 € = 50 €.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 09 Paiement / Livraison : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
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
      coat:    await comp("39:67"),
      pants:   await comp("39:82"),
      baskets: await comp("52:2013"),
      scarf:   await comp("39:115")
    };

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;
    const ART = "Veste en cuir";
    const CMD = "Commande #PND-2481";

    // ---------- briques propres au paiement ----------

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

    function carteTotal(lignes, total) {
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
      t.appendChild(text("À payer", { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(text(total, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      addFill(c, t);
      return c;
    }

    // Suivi : une colonne d'etapes datees. L'etape en cours est la seule
    // en primary, les suivantes restent grises — on lit l'avancement
    // sans lire les libelles.
    function etapes(items) {
      const b = frame("Liste", { dir: "VERTICAL", gap: 0, px: GUT });
      for (let i = 0; i < items.length; i++) {
        const label = items[i][0], date = items[i][1], etat = items[i][2];
        const coul = etat === "erreur" ? C.error
                   : etat === "avenir" ? C.sub
                   : etat === "encours" ? C.primary : C.main;
        const opa = etat === "avenir" ? 0.45 : 1;

        const ligne = frame("Detail/Step/" + label, {
          dir: "HORIZONTAL", gap: S.md, align: "MIN", py: 0
        });

        const rail = frame("Rail", {
          dir: "VERTICAL", w: 24, gap: 0, align: "CENTER",
          primary: "AUTO", counter: "FIXED"
        });
        const pastille = frame("Pastille", {
          w: etat === "encours" ? 16 : 12, h: etat === "encours" ? 16 : 12,
          radius: R.full, fill: coul, fillOpacity: opa,
          dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
        });
        rail.appendChild(pastille);
        if (i < items.length - 1) {
          const trait = figma.createRectangle();
          trait.name = "Trait";
          trait.resize(2, 44);
          trait.fills = solid(C.ink, 0.10);
          rail.appendChild(trait);
        }
        ligne.appendChild(rail);

        const g = frame("Texte", { dir: "VERTICAL", gap: 2, pb: i < items.length - 1 ? S.lg : 0 });
        g.appendChild(text(label, {
          font: FONT_LB, size: 16,
          color: etat === "avenir" ? C.sub : C.ink,
          opacity: opa
        }));
        g.appendChild(text(date, { size: 12, color: C.sub, opacity: opa }));
        ligne.appendChild(g);
        try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
        addFill(b, ligne);
      }
      return b;
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
      if (meta) g.appendChild(text(meta, { size: 12, color: C.sub }));
      r.appendChild(g);
      r.appendChild(droite);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    // ============ 1. Récapitulatif ============
    ecran("Paiement — Récapitulatif", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Récapitulatif", ART + " · Thomas"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement(ART, "Zara · Vestes · L · Très bon état", PIC.jacket, "45 €", "vente"));
      addFill(blocs, carteSection("Livraison", [
        ligneInfo("Mode", "Colissimo"),
        ligneInfo("Adresse", "12 rue des Lilas, Paris"),
        ligneInfo("Estimée", "17 sept. 2026")
      ]));
      addFill(blocs, carteTotal([["Article", "45 €"], ["Livraison", "5 €"]], "50 €"));
      addFill(col, blocs);

      barreActions(col, bouton("Continuer vers le paiement", "primary"), null, null,
        "Rien n'est débité tant que tu n'as pas confirmé.");
      finaliser(screen, col);
    });

    // ============ 2. Paiement ============
    ecran("Paiement — Paiement", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Paiement", "50 € · " + ART));

      const moyens = frame("Section/Moyens", { dir: "VERTICAL", gap: S.md });
      addFill(moyens, enteteSection("Moyen de paiement", null));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, ligneChoix("Carte se terminant par 4242", "Visa · expire 08/28", true));
      addFill(l, ligneChoix("Carte se terminant par 8891", "Mastercard · expire 02/27", false));
      addFill(l, lienRangee("Ajouter une carte", "Visa, Mastercard, CB", "+"));
      addFill(moyens, l);
      addFill(col, moyens);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteTotal([["Article", "45 €"], ["Livraison", "5 €"]], "50 €"));
      const sec = card("Card/Section/Securite", { gap: S.sm });
      sec.appendChild(text("Paiement sécurisé", { font: FONT_LB, size: 12, color: C.sub }));
      sec.appendChild(para("Les 45 € sont conservés par Penderie et versés à Thomas une fois que tu as reçu l'article.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(blocs, sec);
      addFill(col, blocs);

      barreActions(col, bouton("Payer 50 €", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 3. Paiement confirmé ============
    ecran("Paiement — Paiement confirmé", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Paiement confirmé !", "50 € débités."));
      addFill(col, z);

      addFill(col, titrePage("50 € payés", CMD));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement(ART, "Acheté à Thomas", PIC.jacket, "Payé", "encours"));
      addFill(blocs, carteSection("Ce qui se passe ensuite", [
        ligneInfo("Thomas", "Prévenu"),
        ligneInfo("Expédition", "Sous 2 jours"),
        ligneInfo("Versement", "À la réception")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Choisir la livraison", "primary"),
        [bouton("Voir mes achats", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 4. Choix de livraison ============
    ecran("Livraison — Choix de livraison", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Comment tu la récupères ?", ART + " · Thomas"));

      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, ligneChoix("Colissimo · 5 €", "Livré sous 3 jours ouvrés", true));
      addFill(l, ligneChoix("Main propre · gratuit", "À convenir avec Thomas", false));
      addFill(l, ligneChoix("Point relais · 3 €", "Retrait sous 4 jours", false));
      addFill(col, l);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Adresse de livraison", "12 rue des Lilas, 75011 Paris"));
      addFill(col, champs);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteTotal([["Article", "45 €"], ["Livraison", "5 €"]], "50 €"));
      addFill(col, blocs);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "La main propre évite les frais, mais il faut vous croiser.");
      finaliser(screen, col);
    });

    // ============ 5. Suivi de commande ============
    ecran("Livraison — Suivi de commande", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Suivi de commande", CMD));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(el, carteElement(ART, "Acheté à Thomas · 50 €", PIC.jacket, "En transit", "encours"));
      addFill(col, el);

      const sec = frame("Section/Suivi", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Où en est le colis", null));
      addFill(sec, etapes([
        ["Payée",     "12 sept. · 14 h 02", "fait"],
        ["Expédiée",  "13 sept. · 09 h 41", "fait"],
        ["En transit", "Depuis hier · centre de tri de Bercy", "encours"],
        ["Livrée",    "Estimée le 17 sept.", "avenir"]
      ]));
      addFill(col, sec);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("Le transporteur", [
        ligneInfo("Colissimo", "6A 1234 5678 9"),
        ligneInfo("Adresse", "12 rue des Lilas")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Confirmer la réception", "primary"),
        [bouton("Contacter Thomas", "secondary")],
        "Signaler un problème",
        "Ne confirme qu'une fois l'article entre tes mains : Thomas est payé à ce moment-là.");
      finaliser(screen, col);
    });

    // ============ 6. Remise en main propre ============
    ecran("Livraison — Remise en main propre", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Remise en main propre", ART + " · Thomas"));

      const el = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(el, carteElement(ART, "Acheté à Thomas · 45 €", PIC.jacket, "À récupérer", "arendre"));
      addFill(el, carteSection("Le rendez-vous", [
        ligneInfo("Quand", "Samedi 14 sept. · 15 h"),
        ligneInfo("Où", "Métro Père-Lachaise"),
        ligneInfo("Frais", "Aucun")
      ]));
      addFill(col, el);

      const code = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Code", { gap: S.sm, align: "CENTER" });
      c.appendChild(text("Code de remise", { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(text("4 8 2 1", { font: FONT_T, size: 48, color: C.ink, lineHeight: 56 }));
      c.appendChild(para("Donne ce code à Thomas au moment de la remise : il déclenche son paiement.",
        UTIL_CARTE, { size: 12, color: C.sub, lineHeight: 16, align: "CENTER" }));
      addFill(code, c);
      addFill(col, code);

      barreActions(col,
        bouton("J'ai reçu", "primary"),
        [bouton("Contacter Thomas", "secondary")],
        "Signaler un problème", null);
      finaliser(screen, col);
    });

    // ============ 7. Livraison problématique ============
    ecran("Livraison — Livraison problématique", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastInfo("Incident de livraison", "Le colis est bloqué depuis 3 jours.", C.error));
      addFill(col, z);

      addFill(col, titrePage("Colis bloqué", CMD));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(el, carteElement(ART, "Acheté à Thomas · 50 €", PIC.jacket, "En retard", "retard"));
      addFill(col, el);

      const sec = frame("Section/Suivi", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Où en est le colis", null));
      addFill(sec, etapes([
        ["Payée",    "12 sept. · 14 h 02", "fait"],
        ["Expédiée", "13 sept. · 09 h 41", "fait"],
        ["Bloquée au centre de tri", "Depuis le 14 sept.", "erreur"],
        ["Livrée",   "Date inconnue", "avenir"]
      ]));
      addFill(col, sec);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const n = card("Card/Section/Info", { gap: S.sm });
      n.appendChild(para("Tes 50 € sont toujours conservés par Penderie : Thomas ne sera payé qu'à la livraison.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(blocs, n);
      addFill(col, blocs);

      barreActions(col,
        bouton("Signaler un problème", "primary"),
        [bouton("Contacter Thomas", "secondary")], null,
        "Au-delà de 10 jours, le remboursement est automatique.");
      finaliser(screen, col);
    });

    // ============ 8. Mes achats ============
    ecran("Paiement — Mes achats", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes commandes", "4 achats · 2 ventes"));
      addFill(col, onglets("Achats", "Ventes", true));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, carteListe(ART, "Thomas · 50 € · arrive le 17 sept.",
        "En transit", "encours", PIC.jacket, "Card/Order"));
      addFill(liste, carteListe("Baskets Nike", "Julie · 35 € · livrées le 8 sept.",
        "Livrée", "termine", PIC.baskets, "Card/Order"));
      addFill(liste, carteListe("T-shirt Nike", "Karim · 12 € · reçu le 1er sept.",
        "Terminée", "termine", PIC.tshirt, "Card/Order"));
      addFill(liste, carteListe("Écharpe", "Marc · 8 € · remboursée",
        "Remboursée", "vendu", PIC.scarf, "Card/Order"));
      addFill(col, liste);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 9. Mes ventes ============
    ecran("Paiement — Mes ventes", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes commandes", "2 ventes · 68 € encaissés"));
      addFill(col, onglets("Achats", "Ventes", false));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, carteListe("T-shirt Nike", "En vente · 20 € · 4 vues",
        "En vente", "vente", PIC.tshirt, "Card/Order"));
      addFill(liste, carteListe("Baskets Adidas", "Vendues à Julie · 35 € · à remettre",
        "À remettre", "arendre", PIC.baskets, "Card/Order"));
      addFill(col, liste);

      const sec = frame("Section/Terminees", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Terminées", "Tout voir"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, carteListe("Manteau d'hiver", "Vendu à Marc · 33 € versés",
        "Terminée", "termine", PIC.coat, "Card/Order"));
      addFill(sec, l2);
      addFill(col, sec);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 10. Problème de commande ============
    ecran("Paiement — Problème de commande", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Signaler un problème", CMD));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(el, carteElement(ART, "Acheté à Thomas · 50 €", PIC.jacket, "En retard", "retard"));
      addFill(col, el);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, groupeChips("Que s'est-il passé ?",
        ["Jamais reçu", "Article abîmé", "Pas conforme", "Autre"], ["Jamais reçu"]));
      addFill(champs, champTexte("Explique en deux mots",
        "Le colis est bloqué au centre de tri depuis le 14 septembre.", 88));
      addFill(col, champs);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const n = card("Card/Section/Info", { gap: S.sm });
      n.appendChild(text("Ce qui va se passer", { font: FONT_LB, size: 12, color: C.sub }));
      n.appendChild(para("Thomas a 48 h pour répondre. Sans réponse, tes 50 € te sont remboursés automatiquement.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(blocs, n);
      addFill(col, blocs);

      barreActions(col, bouton("Envoyer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 11. Remboursement en cours ============
    ecran("Paiement — Remboursement en cours", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastInfo("Remboursement en cours", "Ta demande a été acceptée.", C.primary));
      addFill(col, z);

      addFill(col, titrePage("50 € en cours de remboursement", CMD));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(el, carteElement(ART, "Acheté à Thomas · 50 €", PIC.jacket, "Remboursement", "arendre"));
      addFill(col, el);

      const sec = frame("Section/Suivi", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Où en est le remboursement", null));
      addFill(sec, etapes([
        ["Problème signalé",       "15 sept. · 10 h 12", "fait"],
        ["Demande acceptée",       "15 sept. · 18 h 30", "fait"],
        ["Remboursement en cours", "Envoyé à ta banque", "encours"],
        ["Remboursement terminé",  "Sous 3 jours ouvrés", "avenir"]
      ]));
      addFill(col, sec);

      barreActions(col,
        bouton("Voir mes achats", "primary"),
        [bouton("Contacter le support", "secondary")], null,
        "Le délai dépend de ta banque, pas de Penderie.");
      finaliser(screen, col);
    });

    // ============ 12. Remboursement terminé ============
    ecran("Paiement — Remboursement terminé", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Remboursement terminé", "50 € recrédités sur ta carte."));
      addFill(col, z);

      addFill(col, titrePage("50 € remboursés", CMD));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement(ART, "Commande annulée", PIC.jacket, "Remboursée", "vendu"));
      addFill(blocs, carteSection("Le remboursement", [
        ligneInfo("Montant", "50 €"),
        ligneInfo("Vers", "Carte ···· 4242"),
        ligneInfo("Effectué le", "18 sept. 2026")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Revenir à mes achats", "primary"),
        [bouton("Racheter ailleurs", "secondary")], null, null);
      finaliser(screen, col);
    });

    rapport("Lot 09 Paiement / Livraison");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
