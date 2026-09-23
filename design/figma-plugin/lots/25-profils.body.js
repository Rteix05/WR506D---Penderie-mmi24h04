// ============================================================
// Lot 25 — PROFILS PROCHES, PROFIL ENFANT, CONTRÔLE PARENTAL
// (page "Maquette v2", sections 12 COMPTE et 13 SYSTÈME)
//
// Audit du brief avant construction (points 13 à 15) :
//   [COUVERT] créer un profil ; changer de profil ; inventaire propre à
//             chaque profil ; restrictions du profil enfant (Autorisations)
//   [PARTIEL] permissions sociales (1 interrupteur « Ajouter des amis »)
//             -> lot 10 adapté (bloc Social + demandes en attente + code parent)
//             supprimer un profil : lien sans confirmation -> NOUVEAU (overlay)
//   [MANQUANT] modifier un profil ; ce que voit l'enfant quand une action est
//             bloquée ; demande envoyée au parent ; code parent (paramètres
//             protégés) ; demandes d'amis du profil enfant ; décision
//             Autoriser / Refuser / Bloquer ; demande autorisée -> NOUVEAUX
//             notification « demande pour Noé »  -> lot 11 adapté
//
// Profil enfant de la maquette : Noé, 9 ans (profil créé dans le lot 10).
// Les demandes sociales de l'enfant n'arrivent JAMAIS chez lui avant la
// décision du parent : un enfant n'est pas exposé à un inconnu.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 25 Profils : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();
    const P = await chargerPics();

    const COMPTE = "COMPTE";
    const SYSTEME = "SYSTEME";

    function blocs(col, noeuds) {
      const b = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < noeuds.length; i++) if (noeuds[i]) addFill(b, noeuds[i]);
      addFill(col, b);
    }

    function liste(col, titre, lien, rangees) {
      const sec = frame("Section/" + titre, { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection(titre, lien));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < rangees.length; i++) addFill(l, rangees[i]);
      addFill(sec, l);
      addFill(col, sec);
    }

    // Ligne « peut / ne peut pas » vue par l'enfant : une coche verte ou un
    // cadenas, jamais une couleur seule.
    function droit(label, ok) {
      const r = frame("Detail/Droit/" + label, { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      const p = frame("Pastille", {
        w: 24, h: 24, radius: R.full, fill: ok ? C.main : C.ink, fillOpacity: ok ? 1 : 0.10,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      p.appendChild(text(ok ? "v" : "–", { font: FONT_LB, size: 12, color: ok ? C.white : C.sub }));
      r.appendChild(p);
      r.appendChild(text(label, { size: 16, color: C.ink }));
      return r;
    }

    // ============ 1. Modifier un profil ============
    ecranNouveau(COMPTE, "Compte — Modifier un profil", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Modifier le profil", "Léa · profil famille"));
      const av = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Avatar", { gap: S.md, align: "CENTER" });
      c.appendChild(avatar("Léa", 1, 88));
      c.appendChild(text("Changer l'avatar", { font: FONT_LB, size: 12, color: C.primary }));
      addFill(av, c);
      addFill(col, av);
      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Prénom", "Léa"));
      addFill(champs, groupeChips("Qui est-ce ?", ["Conjoint", "Enfant", "Proche", "Ami"], ["Proche"]));
      addFill(champs, groupeChips("Type de profil", ["Famille", "Enfant"], ["Famille"]));
      addFill(col, champs);
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, ligneToggle("Voir toute la penderie", "Sinon, seulement ses propres objets", true));
      addFill(l, ligneToggle("Ajouter des objets", null, true));
      addFill(l, ligneToggle("Prêter", "Ses objets, à ses amis", true));
      addFill(l, ligneToggle("Vendre et acheter", null, false));
      addFill(col, l);
      barreActions(col, bouton("Enregistrer", "primary"), null, "Supprimer ce profil",
        "Chaque profil garde son propre inventaire et son propre dressing.");
      finaliser(screen, col);
    });

    // ============ 2. Enfant · action bloquée (vue de l'enfant) ============
    ecranNouveau(COMPTE, "Compte — Enfant · Action bloquée", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      const bloc = frame("Empty state", { dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.xl, align: "CENTER" });
      bloc.appendChild(avatar("Noé", 2, 88));
      const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      txt.appendChild(para("Demande à Mathis", UTIL, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      txt.appendChild(para("Pour vendre ta console, il faut l'accord de ton parent. Elle reste à toi, rien n'est publié.",
        UTIL - S.xl, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bloc, txt);
      addFill(col, bloc);
      const c = card("Card/Section/Ce que tu peux faire", { gap: S.md });
      c.appendChild(text("Ce que tu peux faire tout seul", { font: FONT_LB, size: 12, color: C.sub }));
      addFill(c, droit("Ajouter et ranger tes objets", true));
      addFill(c, droit("Voir ton inventaire", true));
      addFill(c, droit("Prêter à tes amis validés", true));
      addFill(c, droit("Vendre ou acheter", false));
      addFill(c, droit("Ajouter un nouvel ami", false));
      blocs(col, [c]);
      barreActions(col, bouton("Demander à Mathis", "primary"),
        [bouton("Retour à mes objets", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 3. Enfant · demande envoyée ============
    ecranNouveau(COMPTE, "Compte — Enfant · Demande envoyée", 2, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Demande envoyée à Mathis !", "Tu verras sa réponse ici.")]);
      addFill(col, titrePage("Vendre la console", "En attente de l'accord de Mathis"));
      blocs(col, [
        carteElement("Console", "Chambre de Noé › Étagère", P.baskets, "En attente", "arendre"),
        carteSection("Ce qui se passe", [
          ligneInfo("Mathis reçoit", "Une notification"),
          ligneInfo("S'il accepte", "Tu pourras publier"),
          ligneInfo("S'il refuse", "Rien ne change")
        ])
      ]);
      barreActions(col, bouton("Retour à mes objets", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 4. Code parent (paramètres protégés) ============
    ecranNouveau(COMPTE, "Compte — Code parent", 3, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Espace parent", "Code demandé pour modifier les réglages de Noé"));
      const pts = frame("Code", { dir: "HORIZONTAL", gap: S.lg, px: GUT, justify: "CENTER" });
      for (let i = 0; i < 4; i++) {
        pts.appendChild(frame("Chiffre", {
          w: 16, h: 16, radius: R.full, fill: i < 2 ? C.primary : C.ink, fillOpacity: i < 2 ? 1 : 0.12,
          dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
        }));
      }
      addFill(col, pts);
      const touches = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["", "0", "<"]];
      const pave = frame("Pave", { dir: "VERTICAL", gap: S.md, px: GUT, align: "CENTER" });
      for (let i = 0; i < touches.length; i++) {
        const r = frame("Rangee", { dir: "HORIZONTAL", gap: S.lg });
        for (let j = 0; j < 3; j++) {
          const k = touches[i][j];
          const t = frame("Touche/" + (k || "vide"), {
            w: 72, h: 56, radius: R.md, fill: k ? C.white : null, shadow: k ? SHADOW_E1 : null,
            dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
          });
          if (k) t.appendChild(text(k, { font: FONT_T, size: 24, color: C.ink }));
          r.appendChild(t);
        }
        pave.appendChild(r);
      }
      addFill(col, pave);
      blocs(col, [bandeauPrive("Noé ne peut pas changer ses autorisations, ni ses amis, ni ses paramètres sans ce code.")]);
      const oubli = frame("Lien", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      oubli.appendChild(text("Code oublié ? Il se réinitialise depuis le compte de Mathis", { size: 12, color: C.primary }));
      addFill(col, oubli);
      finaliser(screen, col);
    });

    // ============ 5. Demandes du profil enfant ============
    ecranNouveau(COMPTE, "Compte — Demandes du profil enfant", 4, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Demandes pour Noé", "2 en attente · tu décides"));
      blocs(col, [bandeauPrive("Noé ne voit une demande qu'après ton accord. Un refus ou un blocage ne lui est pas montré.")]);
      liste(col, "En attente", "2", [
        rangeeAmi("Hugo", "Veut devenir ami · 1 ami en commun : Léo", 1, statusPill("À décider", "arendre")),
        rangeeAmi("@max_2014", "Aucun ami en commun · compte créé hier", 2, statusPill("À décider", "arendre"))
      ]);
      liste(col, "Déjà traitées", null, [
        rangeeAmi("Léo", "Ami de classe", 0, statusPill("Autorisé", "encours")),
        rangeeAmi("@promo_sneakers", "Compte inconnu", 2, statusPill("Bloqué", "retard"))
      ]);
      finaliser(screen, col);
    });

    // ============ 6. Décision sur une demande ============
    ecranNouveau(COMPTE, "Compte — Demande pour Noé · Décision", 5, function (screen) {
      const col = preparer(screen, 40, 0);
      enteteProfil(col, "Hugo", 1, "veut devenir ami avec Noé", "1 ami en commun : Léo · 10 ans", [
        pastillesRelation([["En attente de ta décision", "arendre"]])
      ]);
      overlay(col.children[0], boutonRetour("<"), GUT, S.xl);
      blocs(col, [
        carteSection("Si tu autorises", [
          ligneInfo("Voir ce que Noé partage", "Oui"),
          ligneInfo("Prêter et emprunter", "Avec ton accord"),
          ligneInfo("Acheter ou vendre", "Jamais"),
          ligneInfo("Commenter", "Non")
        ]),
        bandeauPrive("Bloquer empêche Hugo d'envoyer de nouvelles demandes à Noé. Tu peux revenir sur ta décision dans les autorisations.")
      ]);
      barreActions(col, bouton("Autoriser", "primary"), [bouton("Refuser", "secondary")], "Bloquer", null);
      finaliser(screen, col);
    });

    // ============ 7. Demande autorisée ============
    ecranNouveau(COMPTE, "Compte — Demande pour Noé · Autorisée", 6, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Hugo est ami avec Noé", "Noé le voit maintenant dans ses amis.")]);
      addFill(col, titrePage("Demandes pour Noé", "1 en attente"));
      blocs(col, [carteSection("Ce que tu viens d'autoriser", [
        ligneInfo("Ami", "Hugo"),
        ligneInfo("Prêts", "Avec ton accord"),
        ligneInfo("Ventes et achats", "Toujours bloqués")
      ])]);
      barreActions(col, bouton("Voir les demandes", "primary"), null, null,
        "Tu peux retirer cet ami à Noé à tout moment.");
      finaliser(screen, col);
    });

    // ============ 8. Supprimer un profil (overlay, section 13) ============
    ecranNouveau(SYSTEME, "Système — Confirmation · Supprimer un profil", 0, function (screen) {
      modale(screen,
        "Supprimer le profil de Léa ?",
        "Ses 42 objets et 31 vêtements disparaissent avec son profil. Ton inventaire n'est pas touché.",
        "Supprimer",
        "Le prêt en cours de Léa doit d'abord être clôturé. Cette action est définitive.");
    });

    rapport("Lot 25 Profils");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
