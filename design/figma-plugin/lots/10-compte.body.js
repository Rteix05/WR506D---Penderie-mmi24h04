// ============================================================
// Lot 10 — COMPTE / PARAMÈTRES  (page "Maquette v2", section 12)
//
// 8 ecrans refaits. Le noeud frame est conserve a chaque fois,
// donc les reactions de prototype de niveau frame survivent.
//
// Libelles cliquables attendus par penderie-prototype.js :
// « Mes informations », « Se deconnecter », « Changer », « Gerer » (x2,
// le 2e mene aux autorisations), « + Ajouter un profil », « Compte »,
// « Profils », « Notifications », « Confidentialite », « Partage »,
// « Preferences du dressing », « Preferences des tenues », « Partages »,
// « Enregistrer », « 3 partages · revoquer un acces »,
// « Thomas, Lucas, Marie · gerer », « Mathis », « Lea », « Noe »,
// « Continuer », « Utiliser », « Creer ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 10 Compte : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;

    // ---------- briques propres au compte ----------

    function enteteProfil(col, nom, i, meta, sous) {
      const bande = frame("Entete", {
        dir: "VERTICAL", w: W, gap: S.md, px: GUT, pt: 56, pb: S.xl,
        align: "CENTER", primary: "AUTO", counter: "FIXED",
        fill: C.primary, fillOpacity: 0.06
      });
      bande.appendChild(avatar(nom, i, 88));
      const t = frame("Texte", { dir: "VERTICAL", gap: S.xs, align: "CENTER" });
      t.appendChild(text(nom, { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      t.appendChild(para(meta, W - GUT * 2, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      if (sous) t.appendChild(para(sous, W - GUT * 2, { size: 12, color: C.sub, lineHeight: 16, align: "CENTER" }));
      addFill(bande, t);
      col.appendChild(bande);
      return bande;
    }

    // Rangee de profil : l'avatar suffit a identifier, le role explique
    // ce que ce profil a le droit de faire.
    function ligneProfil(nom, i, role, droite) {
      return rangeeAmi(nom, role, i, droite);
    }

    function section(col, titre, lien, rangees) {
      const sec = frame("Section/" + titre, { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection(titre, lien));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < rangees.length; i++) addFill(l, rangees[i]);
      addFill(sec, l);
      addFill(col, sec);
      return sec;
    }

    // ============ 1. Profil ============
    ecran("Compte — Profil", function (screen) {
      const col = preparer(screen, 110, 0);
      enteteProfil(col, "Mathis", 0, "@mathis · membre depuis mars 2026",
        "128 objets · 48 vêtements · 12 amis");

      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("Mes informations", "Nom, e-mail, mot de passe"));
      addFill(l, lienRangee("Mes logements", "2 logements · 7 pièces"));
      addFill(l, lienRangee("Mes amis", "12 amis · 2 demandes"));
      // lot 23 : les collections n'ont pas d'onglet, on y entre par le profil
      addFill(l, lienRangee("Mes collections", "4 collections · privées par défaut"));
      // lot 27 : le fil n'a pas d'onglet non plus
      addFill(l, lienRangee("Fil d'actualité", "Ce que tes amis ont choisi de te montrer"));
      addFill(l, lienRangee("Confidentialité", "Qui voit quoi"));
      addFill(l, lienRangee("Paramètres", "Notifications, préférences"));
      addFill(col, l);

      const d = frame("Destructif", { dir: "HORIZONTAL", justify: "CENTER", px: GUT, pt: S.md });
      d.appendChild(text("Se déconnecter", { font: FONT_LB, size: 16, color: C.error }));
      addFill(col, d);

      finaliser(screen, col);
      poserNav(screen, "Profil");
    });

    // ============ 2. Mon compte ============
    ecran("Compte — Mon compte", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mon compte", "Mathis · @mathis"));

      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("mathis@example.com", "Adresse e-mail vérifiée", "Changer"));
      addFill(l, lienRangee("Mot de passe", "Modifié il y a 3 mois", "Changer"));
      addFill(col, l);

      // Deux rangees « Gerer » : la 1re mene au profil famille, la 2e aux
      // autorisations. Leur ordre est ce qui les distingue dans le proto.
      section(col, "Profils de la famille", "3 profils", [
        ligneProfil("Mathis", 0, "Profil principal · c'est toi", statusPill("Actif", "encours")),
        ligneProfil("Léa", 1, "Profil famille · accès complet",
          text("Gérer", { font: FONT_LB, size: 12, color: C.primary })),
        ligneProfil("Noé", 2, "Profil enfant · 9 ans",
          text("Gérer", { font: FONT_LB, size: 12, color: C.primary }))
      ]);

      const ajout = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(ajout, lienRangee("+ Ajouter un profil", "Famille ou enfant"));
      addFill(col, ajout);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("Ton compte", [
        ligneInfo("Membre depuis", "Mars 2026"),
        ligneInfo("Objets", "128"),
        ligneInfo("Stockage photos", "1,2 Go")
      ]));
      addFill(col, blocs);

      barreActions(col, bouton("Enregistrer", "primary"), null,
        "Supprimer mon compte", null);
      finaliser(screen, col);
    });

    // ============ 3. Paramètres ============
    ecran("Compte — Paramètres", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Paramètres", "Mathis · @mathis"));

      section(col, "Ton compte", null, [
        lienRangee("Compte", "Nom, e-mail, mot de passe"),
        lienRangee("Profils", "Mathis, Léa, Noé"),
        lienRangee("Notifications", "Prêts, ventes, partages")
      ]);

      section(col, "Vie privée", null, [
        lienRangee("Confidentialité", "Qui voit quoi"),
        lienRangee("Partage", "3 partages actifs")
      ]);

      section(col, "L'application", null, [
        lienRangee("Préférences du dressing", "Filtres et tri par défaut"),
        lienRangee("Préférences des tenues", "Contexte, météo, exclusions"),
        lienRangee("À propos", "Version 1.0 · mentions légales")
      ]);

      finaliser(screen, col);
    });

    // ============ 4. Confidentialité ============
    ecran("Compte — Confidentialité", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Confidentialité", "Par défaut, personne ne voit rien"));

      const rappel = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Principe", { gap: S.sm });
      c.appendChild(text("Le principe", { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para("Ta penderie est privée. Un ami ne voit que ce que tu lui as explicitement partagé, élément par élément.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(rappel, c);
      addFill(col, rappel);

      section(col, "Ce qui est partagé", null, [
        lienRangee("Partages", "3 partages · révoquer un accès"),
        lienRangee("Qui peut voir mon dressing", "Thomas, Lucas, Marie · gérer")
      ]);

      const regles = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(regles, ligneToggle("Masquer la localisation", "Tes amis ne voient jamais où tu ranges", true));
      addFill(regles, ligneToggle("Autoriser les commentaires", "Sur les éléments partagés", true));
      addFill(regles, ligneToggle("Apparaître dans les suggestions d'amis", null, false));
      addFill(regles, ligneToggle("Historique de port visible", "Seulement toi, par défaut", false));
      addFill(col, regles);

      barreActions(col, bouton("Enregistrer", "primary"), null, null,
        "Ces réglages s'appliquent à tous tes profils.");
      finaliser(screen, col);
    });

    // ============ 5. Changer de profil ============
    ecran("Compte — Changer de profil", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Changer de profil", "Chaque profil a sa propre penderie"));

      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, ligneProfil("Mathis", 0, "Profil principal · 128 objets",
        statusPill("Actif", "encours")));
      addFill(l, ligneProfil("Léa", 1, "Profil famille · 42 objets", null));
      addFill(l, ligneProfil("Noé", 2, "Profil enfant · 9 ans · 18 objets", null));
      addFill(col, l);

      const gerer = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(gerer, lienRangee("Profils de la famille", "Ajouter, modifier, supprimer", "Gérer"));
      addFill(col, gerer);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Les objets d'un profil ne sont pas visibles depuis un autre.");
      finaliser(screen, col);
    });

    // ============ 6. Profil famille ============
    ecran("Compte — Profil famille", function (screen) {
      const col = preparer(screen, 40, 0);
      enteteProfil(col, "Léa", 1, "Profil famille", "Créé le 4 avril 2026");
      overlay(col.children[0], boutonRetour("<"), GUT, S.xl);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("Ce que Léa peut faire", [
        ligneInfo("Voir la penderie", "Complète"),
        ligneInfo("Ajouter des objets", "Oui"),
        ligneInfo("Prêter", "Oui"),
        ligneInfo("Vendre", "Non")
      ]));
      addFill(blocs, carteSection("Sa penderie", [
        ligneInfo("Objets", "42"),
        ligneInfo("Vêtements", "31"),
        ligneInfo("Prêts en cours", "1")
      ]));
      addFill(col, blocs);

      const regles = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(regles, ligneToggle("Partager les logements", "Léa voit les mêmes pièces et rangements", true));
      addFill(regles, ligneToggle("Partager les amis", "Elle garde sa propre liste", false));
      addFill(col, regles);

      barreActions(col,
        bouton("Utiliser", "primary"),
        [bouton("Modifier", "secondary")],
        "Supprimer ce profil", null);
      finaliser(screen, col);
    });

    // ============ 7. Nouveau profil enfant ============
    ecran("Compte — Nouveau profil enfant", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Nouveau profil enfant", "Une penderie à lui, sous ta surveillance"));

      const av = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Avatar", { gap: S.md, align: "CENTER" });
      c.appendChild(avatar("Noé", 2, 88));
      c.appendChild(text("Choisir un avatar", { font: FONT_LB, size: 12, color: C.primary }));
      addFill(av, c);
      addFill(col, av);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Prénom", "Noé"));
      addFill(champs, champSelect("Âge", "9 ans"));
      addFill(champs, groupeChips("Type de profil", ["Enfant", "Famille"], ["Enfant"]));
      addFill(col, champs);

      const regles = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(regles, ligneToggle("Peut ajouter des objets", null, true));
      addFill(regles, ligneToggle("Peut emprunter à ses amis", "Avec ton accord à chaque fois", true));
      addFill(regles, ligneToggle("Peut vendre", "Désactivé pour les moins de 15 ans", false));
      addFill(col, regles);

      barreActions(col, bouton("Créer", "primary"), null, null,
        "Tu pourras régler les autorisations juste après.");
      finaliser(screen, col);
    });

    // ============ 8. Autorisations parentales ============
    ecran("Compte — Autorisations parentales", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Autorisations", "Noé · profil enfant · 9 ans"));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Profil", { gap: S.md });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      l.appendChild(avatar("Noé", 2, 56));
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text("Noé", { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(text("Profil enfant · créé aujourd'hui", { size: 12, color: C.sub }));
      l.appendChild(g);
      l.appendChild(statusPill("Surveillé", "arendre"));
      addFill(c, l);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      addFill(el, c);
      addFill(col, el);

      // Lot 25 : trois familles de réglages (ranger, social, argent), les
      // demandes en attente, et des réglages protégés par le code parent.
      const regles = frame("Section/Ranger", { dir: "VERTICAL", gap: S.md });
      addFill(regles, enteteSection("Ranger ses affaires", null));
      const l1 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l1, ligneToggle("Ajouter des objets", "Sans ton accord", true));
      addFill(l1, ligneToggle("Modifier ses propres objets", "Nom, photo, emplacement", true));
      addFill(l1, ligneToggle("Prêter ses objets", "Uniquement à ses amis validés", true));
      addFill(l1, ligneToggle("Emprunter", "Tu reçois une demande à chaque fois", true));
      addFill(regles, l1);
      addFill(col, regles);

      const social = frame("Section/Social", { dir: "VERTICAL", gap: S.md });
      addFill(social, enteteSection("Relations", null));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, ligneToggle("Recevoir des demandes d'amis", "Tu valides chaque demande avant Noé", true));
      addFill(l2, ligneToggle("S'abonner et être suivi", "Désactivé : invisible des inconnus", false));
      addFill(l2, ligneToggle("Commenter", "Désactivé pour un profil enfant", false));
      addFill(l2, lienRangee("Demandes en attente", "2 demandes d'amis", "Voir"));
      addFill(l2, lienRangee("Amis validés", "Léo, Sacha, Jade"));
      addFill(social, l2);
      addFill(col, social);

      const argent = frame("Section/Argent", { dir: "VERTICAL", gap: S.md });
      addFill(argent, enteteSection("Vendre et acheter", null));
      const l3 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l3, ligneToggle("Vendre et acheter", "Avec ton accord à chaque fois", false));
      addFill(argent, l3);
      addFill(col, argent);

      barreActions(col, bouton("Enregistrer", "primary"), null, null,
        "Protégé par ton code parent : Noé ne peut pas modifier ces réglages. Tu peux revenir dessus à tout moment.");
      finaliser(screen, col);
    });

    rapport("Lot 10 Compte");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
