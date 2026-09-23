// ============================================================
// Lot 06 — AMIS  (page "Maquette v2", section 08)
//
// 6 ecrans refaits. Le noeud frame est conserve a chaque fois,
// donc les reactions de prototype de niveau frame survivent.
// Aucun contenu ni action retire : seule la composition change.
//
// Libelles cliquables attendus par penderie-prototype.js :
// « + Ajouter », « Demandes », « Julie », « Ami », « Envoyer »,
// « Demande envoyee ! », « Retour », « Accepter », « Refuser »,
// « Partager », « Retirer », « Voir », « Voir les 3 elements › »,
// « + Ajouter un ami ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 06 Amis : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();

    // ---------- briques propres aux amis ----------

    // Pastille de comptage : l'info « 2 demandes en attente » doit se
    // voir sans lire, c'est le seul point d'accent de la rangee.
    function chipCompteur(label, n) {
      const c = frame("Chip/Filter/" + label, {
        dir: "HORIZONTAL", gap: S.sm, radius: R.full, px: S.lg, h: 36,
        counter: "FIXED", align: "CENTER", fill: C.white, shadow: SHADOW_E1
      });
      c.appendChild(text(label, { font: FONT_LB, size: 12, color: C.ink }));
      const b = frame("Badge/Count", {
        w: 20, h: 20, radius: R.full, fill: C.primary, dir: "VERTICAL",
        align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      b.appendChild(text(String(n), { font: FONT_LB, size: 12, color: C.white }));
      c.appendChild(b);
      return c;
    }

    function lienTexte(label) {
      const f = frame("Lien/" + label, { dir: "HORIZONTAL", align: "CENTER" });
      f.appendChild(text(label, { font: FONT_LB, size: 12, color: C.primary }));
      return f;
    }

    // enteteProfil, bandeauPrive et etatVidePersonnes sont dans la lib
    // depuis le lot 20 (abonnes), qui les reutilise.

    // Hub des relations : memes onglets sur Mes amis, Mes abonnes et Mes
    // abonnements (lot 20). Les demandes restent dans la pastille dediee.
    const ONGLETS_RELATIONS = ["Amis (12)", "Abonnés (5)", "Abonnements (4)"];

    // ============ 1. Mes amis ============
    ecran("Amis — Mes amis", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes amis", "12 amis · 2 demandes en attente"));
      addFill(col, ongletsN(ONGLETS_RELATIONS, 0));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher un ami..."));
      addFill(col, rech);

      const actions = frame("Filtres", {
        dir: "HORIZONTAL", gap: S.sm, px: GUT, align: "CENTER", justify: "SPACE_BETWEEN"
      });
      actions.appendChild(chipCompteur("Demandes", 2));
      actions.appendChild(lienTexte("+ Ajouter"));
      addFill(col, actions);

      const dem = frame("Section/Demandes", { dir: "VERTICAL", gap: S.md });
      addFill(dem, enteteSection("Demandes reçues", null));
      const l1 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l1, rangeeAmi("Julie", "3 amis en commun · reçue hier", 1, statusPill("À répondre", "arendre")));
      addFill(l1, rangeeAmi("Sarah", "1 ami en commun · reçue le 8 sept.", 2, statusPill("À répondre", "arendre")));
      addFill(dem, l1);
      addFill(col, dem);

      const tous = frame("Section/Mes amis", { dir: "VERTICAL", gap: S.md });
      addFill(tous, enteteSection("Mes amis", "12 amis"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, rangeeAmi("Thomas", "2 prêts en cours · partage son dressing", 0, statusPill("Ami", "encours")));
      addFill(l2, rangeeAmi("Karim", "Rien en cours", 2, null));
      addFill(l2, rangeeAmi("Léa", "1 objet emprunté", 0, null));
      addFill(l2, rangeeAmi("Marc", "Rien en cours", 1, null));
      addFill(tous, l2);
      addFill(col, tous);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 2. Ajouter un ami ============
    ecran("Amis — Ajouter un ami", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Ajouter un ami", "Par pseudo, ou en faisant scanner ton code"));

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champRecherche("Pseudo ou adresse e-mail"));
      addFill(col, champs);

      const qr = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/QR", { gap: S.md, align: "CENTER" });
      const carre = frame("Photo", {
        w: 160, h: 160, radius: R.md, fill: C.ink, fillOpacity: 0.06,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED", clip: true
      });
      carre.appendChild(text("QR", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
      c.appendChild(carre);
      const t = frame("Texte", { dir: "VERTICAL", gap: 2, align: "CENTER" });
      t.appendChild(text("Ton code Penderie", { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(text("@rafael · fais-le scanner par un ami", { size: 12, color: C.sub }));
      addFill(c, t);
      addFill(qr, c);
      addFill(col, qr);

      const sug = frame("Section/Suggestions", { dir: "VERTICAL", gap: S.md });
      addFill(sug, enteteSection("Suggestions", null));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, rangeeAmi("Karim", "4 amis en commun", 2, statusPill("Choisi", "arendre")));
      addFill(l, rangeeAmi("Inès", "2 amis en commun", 1, null));
      addFill(l, rangeeAmi("Paul", "1 ami en commun", 0, null));
      addFill(sug, l);
      addFill(col, sug);

      barreActions(col, bouton("Envoyer", "primary"), null, null,
        "Karim recevra une demande. Rien n'est partagé tant qu'il n'accepte pas.");
      finaliser(screen, col);
    });

    // ============ 3. Demande envoyée ============
    ecran("Amis — Demande envoyée", function (screen) {
      const col = preparer(screen, 40);

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, toastSucces("Demande envoyée !", "Karim la verra à sa prochaine connexion."));
      addFill(col, zone);

      addFill(col, titrePage("Karim", "Demande envoyée aujourd'hui"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("En attente", [
        ligneInfo("Envoyée le", "12 sept. 2026"),
        ligneInfo("Statut", "En attente")
      ]));
      addFill(blocs, bandeauPrive("Tant que Karim n'a pas accepté, il ne voit rien de ta penderie."));
      addFill(col, blocs);

      barreActions(col, bouton("Retour", "primary"), null, "Annuler la demande", null);
      finaliser(screen, col);
    });

    // ============ 4. Demande reçue ============
    ecran("Amis — Demande reçue", function (screen) {
      const col = preparer(screen, 40, 0);
      enteteProfil(col, "Julie", 1, "veut rejoindre tes amis", "3 amis en commun · inscrite depuis mars 2026");
      overlay(col.children[0], boutonRetour("X"), GUT, S.xl);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("Vous avez en commun", [
        ligneInfo("Amis", "Thomas, Karim, Marc"),
        ligneInfo("Objets échangés", "Aucun")
      ]));
      addFill(blocs, bandeauPrive("Accepter ne partage rien : tu choisis ensuite ce que Julie peut voir, élément par élément."));
      addFill(col, blocs);

      barreActions(col,
        bouton("Accepter", "primary"),
        [bouton("Refuser", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 5. Profil ami ============
    ecran("Amis — Profil ami", function (screen) {
      const col = preparer(screen, 40, 0);
      // Etat « deja amis » du parcours abonnes : l'amitie et l'abonnement
      // sont deux relations distinctes, affichees cote a cote.
      enteteProfil(col, "Thomas", 0, "Ami depuis mars 2026", "3 amis en commun", [
        compteursProfil([[52, "abonnés"], [40, "abonnements"], [17, "amis"]]),
        pastillesRelation([["Vous êtes amis", "encours"], ["Vous vous suivez", "arendre"]])
      ]);
      overlay(col.children[0], boutonRetour("<"), GUT, S.xl);

      const part = frame("Section/Partage", { dir: "VERTICAL", gap: S.md });
      addFill(part, enteteSection("Ce qu'il partage avec toi", "Voir les 3 éléments ›"));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("Son dressing", "24 vêtements visibles", "Voir"));
      addFill(l, lienRangee("Ses objets à vendre", "2 annonces"));
      addFill(part, l);
      addFill(col, part);

      const entre = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(entre, carteSection("Entre vous", [
        ligneInfo("Prêts en cours", "2"),
        ligneInfo("Objets rendus", "7"),
        ligneInfo("Retards", "0")
      ]));
      addFill(entre, bandeauPrive("Thomas ne voit que ce que tu lui as explicitement partagé."));
      addFill(col, entre);

      barreActions(col,
        bouton("Partager", "primary"),
        [bouton("Prêter un objet", "secondary")],
        "Retirer", null);
      finaliser(screen, col);
    });

    // ============ 6. État · Aucun ami ============
    ecran("Amis — État · Aucun ami", function (screen) {
      etatVidePersonnes(screen, "Mes amis", "0 ami",
        "Tu n'as pas encore d'ami",
        "Penderie ne sert à rien tout seul : ajoute un ami pour lui prêter un objet ou lui montrer ton dressing.",
        "+ Ajouter un ami");
    });

    rapport("Lot 06 Amis");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
