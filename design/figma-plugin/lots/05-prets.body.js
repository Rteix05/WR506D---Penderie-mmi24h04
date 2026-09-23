// ============================================================
// Lot 05 — PRÊTS  (page "Maquette v2", section 07)
//
// 8 ecrans refaits. Le noeud frame est conserve a chaque fois,
// donc les reactions de prototype de niveau frame survivent.
// Aucun contenu ni action retire : seule la composition change.
//
// Les libelles cliquables sont ceux de penderie-prototype.js
// (« Thomas », « Continuer », « Confirmer le pret », « J'ai emprunte »,
// « Pretee a Thomas · retour 20 sept. », « Console »...) : les
// reecrire casse le prototype.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 05 Prets : demarrage...", { timeout: 1500 });
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
      pants:   await comp("39:82"),
      baskets: await comp("52:2013"),
      coat:    await comp("39:67")
    };

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;

    // ---------- briques propres aux prets ----------

    // Carte de pret : la photo de l'objet, ce qui compte (a qui / jusqu'a
    // quand) en une ligne, le statut en pastille. Meme grammaire que la
    // carte objet du lot 02.
    // Meme rangee que partout ailleurs, seul le nom de calque change.
    function cartePret(objet, ligne, statut, tone, pic) {
      return carteListe(objet, ligne, statut, tone, pic, "Card/Loan");
    }

    // Deux onglets, un seul actif : c'est une bascule de contenu, pas
    // deux boutons d'action — d'ou le rail gris et l'onglet plein.
    function onglets(gauche, droite, actifGauche) {
      const b = frame("Onglets", { dir: "VERTICAL", px: GUT });
      const rail = frame("Rail", {
        dir: "HORIZONTAL", gap: S.xs, radius: R.full, px: S.xs, py: S.xs,
        fill: C.ink, fillOpacity: 0.05, align: "CENTER"
      });
      const items = [[gauche, actifGauche], [droite, !actifGauche]];
      for (let i = 0; i < items.length; i++) {
        const label = items[i][0], actif = items[i][1];
        const o = frame("Nav/Tab/" + label + (actif ? "/Actif" : "/Inactif"), {
          dir: "HORIZONTAL", radius: R.full, h: 36, counter: "FIXED",
          align: "CENTER", justify: "CENTER",
          fill: actif ? C.white : null, shadow: actif ? SHADOW_E1 : null
        });
        o.appendChild(text(label, {
          font: FONT_LB, size: 12, color: actif ? C.ink : C.sub, opacity: actif ? 1 : 0.8
        }));
        addFill(rail, o);
      }
      addFill(b, rail);
      return b;
    }

    function carteRecapObjet(objet, meta, pic, pastille, tone) {
      const c = card("Card/Section/Objet", { gap: S.md });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      l.appendChild(photoBox(56, 56, R.sm, pic, C.ink));
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(objet, { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para(meta, 170, { size: 12, color: C.sub, lineHeight: 16 }));
      l.appendChild(g);
      if (pastille) l.appendChild(statusPill(pastille, tone));
      addFill(c, l);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return c;
    }

    // ---------- donnees de reference ----------
    const OBJ = "Perceuse Bosch";
    const OBJ_PIC = PIC.pants;                       // vignette de substitution
    const LOC = "Maison principale › Garage › Étagère 2 › Carton Bricolage";

    // ============ 1. Choisir un ami ============
    ecran("Prêt — Choisir un ami", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("À qui tu le prêtes ?", "Étape 1 sur 3 · " + OBJ));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher un ami..."));
      addFill(col, rech);

      const rec = frame("Section/Recents", { dir: "VERTICAL", gap: S.md });
      addFill(rec, enteteSection("Récents", null));
      const l1 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l1, rangeeAmi("Thomas", "2 prêts en cours · rend toujours à temps", 0, statusPill("Choisi", "arendre")));
      addFill(l1, rangeeAmi("Julie", "1 prêt en cours", 1, null));
      addFill(rec, l1);
      addFill(col, rec);

      const tous = frame("Section/Tous mes amis", { dir: "VERTICAL", gap: S.md });
      addFill(tous, enteteSection("Tous mes amis", "12 amis"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, rangeeAmi("Karim", "Jamais emprunté", 2, null));
      addFill(l2, rangeeAmi("Léa", "Jamais emprunté", 0, null));
      addFill(l2, rangeeAmi("Marc", "3 prêts terminés", 1, null));
      addFill(tous, l2);
      addFill(col, tous);

      barreActions(col, bouton("Continuer", "primary"), null, null);
      finaliser(screen, col);
    });

    // ============ 2. Informations ============
    ecran("Prêt — Informations", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Informations du prêt", "Étape 2 sur 3"));

      const recap = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(recap, carteRecapObjet(OBJ, "Prêtée à Thomas", OBJ_PIC, "À prêter", "arendre"));
      addFill(col, recap);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Date de retour prévue", "20 septembre 2026"));
      addFill(champs, champSelect("Rappel", "3 jours avant"));
      addFill(champs, champTexte("Note pour Thomas (facultatif)",
        "Les mèches sont dans la boîte, rends-la avant le week-end.", 88));
      addFill(col, champs);

      const regles = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(regles, ligneToggle("Prévenir Thomas", "Il reçoit une notification", true));
      addFill(regles, ligneToggle("Me rappeler le retour", "3 jours avant le 20 septembre", true));
      addFill(col, regles);

      barreActions(col, bouton("Continuer", "primary"), null, null);
      finaliser(screen, col);
    });

    // ============ 3. Vérification ============
    ecran("Prêt — Vérification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Vérifie le prêt", "Étape 3 sur 3"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteRecapObjet(OBJ, LOC, OBJ_PIC, null, null));

      const ami = card("Card/Section/Ami", { gap: S.md });
      ami.appendChild(text("Prêté à", { font: FONT_LB, size: 12, color: C.sub }));
      const la = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      la.appendChild(avatar("Thomas", 0, 40));
      const gt = frame("Texte", { dir: "VERTICAL", gap: 2 });
      gt.appendChild(text("Thomas", { font: FONT_LB, size: 16, color: C.ink }));
      gt.appendChild(text("Prévenu par notification", { size: 12, color: C.sub }));
      la.appendChild(gt);
      addFill(ami, la);
      try { gt.layoutSizingHorizontal = "FILL"; } catch (e) {}
      addFill(blocs, ami);

      addFill(blocs, carteSection("Conditions", [
        ligneInfo("Retour prévu", "20 sept. 2026"),
        ligneInfo("Durée", "8 jours"),
        ligneInfo("Rappel", "3 jours avant")
      ]));

      const note = card("Card/Section/Note", { gap: S.sm });
      note.appendChild(text("Note", { font: FONT_LB, size: 12, color: C.sub }));
      note.appendChild(para("Les mèches sont dans la boîte, rends-la avant le week-end.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(blocs, note);
      addFill(col, blocs);

      barreActions(col,
        bouton("Confirmer le prêt", "primary"),
        [bouton("Modifier", "secondary")],
        null, "L'objet passera en « Prêté » et sortira de tes objets disponibles.");
      finaliser(screen, col);
    });

    // ============ 4. Confirmation ============
    ecran("Prêt — Confirmation", function (screen) {
      const col = preparer(screen, 40);

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, toastSucces("Prêt enregistré !", "Thomas a reçu une notification."));
      addFill(col, zone);

      addFill(col, titrePage(OBJ, "Prêtée à Thomas jusqu'au 20 septembre"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteRecapObjet(OBJ, "Chez Thomas depuis aujourd'hui", OBJ_PIC, "Prêté", "prete"));
      addFill(blocs, carteSection("Prochaine étape", [
        ligneInfo("Rappel", "17 sept. 2026"),
        ligneInfo("Retour prévu", "20 sept. 2026")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Voir l'objet", "primary"),
        [bouton("Retour à l'accueil", "secondary")], null);
      finaliser(screen, col);
    });

    // ============ 5. Mes prêts · J'ai prêté ============
    ecran("Prêt — Mes prêts · J'ai prêté", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes prêts", "3 en cours · 1 en retard"));
      addFill(col, onglets("J'ai prêté", "J'ai emprunté", true));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, cartePret(OBJ, "Prêtée à Thomas · retour 20 sept.", "En cours", "encours", OBJ_PIC));
      addFill(liste, cartePret("Tondeuse", "Prêtée à Julie · retour prévu le 5 sept.", "En retard", "retard", PIC.coat));
      addFill(liste, cartePret("Appareil photo", "Prêté à Marc · retour demain", "À rendre", "arendre", PIC.baskets));
      addFill(col, liste);

      const sec = frame("Section/Termines", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Terminés", "Tout voir"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, cartePret("Livre de cuisine", "Prêté à Léa · rendu le 2 sept.", "Terminé", "termine", PIC.tshirt));
      addFill(sec, l2);
      addFill(col, sec);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 6. Mes prêts · J'ai emprunté ============
    ecran("Prêt — Mes prêts · J'ai emprunté", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes prêts", "2 objets empruntés"));
      addFill(col, onglets("J'ai prêté", "J'ai emprunté", false));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, cartePret("Console", "Empruntée à Karim · à rendre le 18 sept.", "À rendre", "arendre", PIC.baskets));
      // même objet que la fiche Emprunté (lot 21)
      addFill(liste, cartePret("Ponceuse Makita", "Empruntée à Thomas · à rendre le 25 sept.", "En cours", "encours", PIC.pants));
      addFill(col, liste);

      const sec = frame("Section/Termines", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Terminés", "Tout voir"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, cartePret("Valise", "Empruntée à Julie · rendue le 28 août", "Terminé", "termine", PIC.jacket));
      addFill(sec, l2);
      addFill(col, sec);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 7. Retour · Objet rendu ? ============
    ecran("Prêt — Retour · Objet rendu ?", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Objet rendu ?", OBJ + " · prêtée à Thomas"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteRecapObjet(OBJ, "Chez Thomas depuis le 12 septembre", OBJ_PIC, "Prêté", "prete"));
      addFill(blocs, carteSection("Le prêt", [
        ligneInfo("Prêté le", "12 sept. 2026"),
        ligneInfo("Retour prévu", "20 sept. 2026"),
        ligneInfo("Durée", "8 jours")
      ]));
      addFill(col, blocs);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Où tu le ranges ?", LOC));
      addFill(col, champs);

      const regles = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(regles, ligneToggle("État vérifié", "Rien à signaler", true));
      addFill(regles, ligneToggle("Remercier Thomas", "Il reçoit une notification", false));
      // lot 21 : un retour abîmé passe par l'écran « État au retour »
      addFill(regles, lienRangee("Il est abîmé ?", "Indique son état au retour", "Signaler un dommage"));
      addFill(col, regles);

      barreActions(col,
        bouton("Confirmer le retour", "primary"), null, null,
        "L'objet repasse en « Disponible » à son emplacement habituel.");
      finaliser(screen, col);
    });

    // ============ 8. Retour · Confirmation ============
    ecran("Prêt — Retour · Confirmation", function (screen) {
      const col = preparer(screen, 40);

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, toastSucces("Objet rendu !", "La perceuse est de retour dans ta penderie."));
      addFill(col, zone);

      addFill(col, titrePage(OBJ, "Disponible · rendue aujourd'hui"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteRecapObjet(OBJ, LOC, OBJ_PIC, "Disponible", "dispo"));
      addFill(blocs, carteSection("Ce prêt", [
        ligneInfo("Prêté à", "Thomas"),
        ligneInfo("Du", "12 au 20 sept."),
        ligneInfo("Durée", "8 jours")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Voir l'objet", "primary"),
        [bouton("Mes prêts", "secondary")], null);
      finaliser(screen, col);
    });

    rapport("Lot 05 Prets");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
