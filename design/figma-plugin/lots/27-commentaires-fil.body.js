// ============================================================
// Lot 27 — COMMENTAIRES ET FIL D'ACTUALITÉ
// (page "Maquette v2", section 15 COLLECTIONS et NOUVELLE « 16 — FIL D'ACTUALITÉ »)
//
// Audit avant construction :
//   [COUVERT] fil de commentaires d'un élément partagé (Partage — Commentaires) ;
//             commentaires dans la vue ami d'une collection ; réglage
//             « Autoriser les commentaires » ; aucun commentaire pour un abonné ;
//             commentaires signalés dans le back-office
//   [MANQUANT] vue propriétaire avec ses commentaires ; répondre, masquer,
//             signaler, supprimer ; états (aucun, désactivés, publié, masqué,
//             supprimé) ; commenter une pièce précise ; fil d'actualité
//
// 22 écrans NOUVEAUX :
//   section 15 — 11 écrans « Collection — … » (commentaires)
//   section 16 — 11 écrans « Fil — … »
//
// Cadrage du fil (demande utilisateur du 13 septembre) :
//   - rien n'est public : chaque publication montre son audience
//   - amis autorisés : voient et commentent (si autorisé) ;
//     abonnés autorisés : voient, en lecture seule, sans commentaires
//   - pas d'inconnus, pas de publicité, pas de « j'aime » ni de compteur
//   - supprimer une publication ne supprime jamais ce qu'elle montre
//   - un signalement part vers le back-office (Admin — Signalements)
// ============================================================

(async function () {
  try {
    figma.notify("Lot 27 Commentaires et fil : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();
    const P = await chargerPics();

    const COL = "COLLECTIONS";
    const FIL = "FIL D";
    sectionAssuree("16 — FIL D'ACTUALITÉ", FIL);

    const NOM = "Mon style — été 2026";
    const MOOD = [
      [0, 0, 4, 4, P.jacket,  null,      "À la une"],
      [4, 0, 2, 2, P.baskets, null,      null],
      [4, 2, 2, 3, P.tshirt,  C.primary, null],
      [0, 4, 2, 2, P.cap,     C.main,    null],
      [2, 4, 2, 2, P.pants,   null,      null],
      [4, 5, 2, 3, null,      C.cloth,   "Inspiration"],
      [0, 6, 4, 2, P.scarf,   C.primary, "Souvenir"]
    ];
    const MOOD_MINI = [
      [0, 0, 4, 4, P.jacket, null, null],
      [4, 0, 2, 2, P.baskets, null, null],
      [4, 2, 2, 2, P.tshirt, C.primary, null]
    ];

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
    function champCommentaire(col, placeholder) {
      const c = frame("Champs", { dir: "VERTICAL", px: GUT });
      addFill(c, champTexte("Ton commentaire", placeholder || "Écrire un commentaire...", 72));
      addFill(col, c);
    }
    function miniMood(largeur) {
      return moodboard(MOOD_MINI, largeur, 6, "Moodboard/Apercu").node;
    }
    function lien(col, label) {
      const l = frame("Lien", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      l.appendChild(text(label, { font: FONT_LB, size: 16, color: C.primary }));
      addFill(col, l);
    }

    // ============ SECTION 15 — COMMENTAIRES D'UNE COLLECTION ============

    // 1. Vue propriétaire avec ses commentaires
    ecranNouveau(COL, "Collection — Vue propriétaire · Commentaires", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Commentaires", NOM + " · 3 commentaires"));
      blocs(col, [miniMood(UTIL), ligneToggle("Commentaires activés", "Amis autorisés uniquement · jamais les abonnés", true)]);
      liste(col, "Sur la collection", null, [
        commentaireMenu("Julie", 1, "La veste avec les baskets blanches, parfait pour Lisbonne !", "hier", false),
        commentaireMenu("Mathis", 0, "C'est exactement l'idée.", "il y a 2 h", true, "Toi")
      ]);
      liste(col, "Sur la Veste en jean", null, [
        commentaireMenu("Thomas", 0, "Tu me la prêtes pour samedi ?", "il y a 20 min", false)
      ]);
      champCommentaire(col, "Répondre à tes amis...");
      barreActions(col, bouton("Publier", "primary"), null, null,
        "Tu peux masquer un commentaire chez toi ou le signaler. Les abonnés ne voient jamais cette zone.");
      finaliser(screen, col);
    }, 0);

    // 2. Actions sur le commentaire d'un ami (overlay)
    ecranNouveau(COL, "Collection — Commentaire · Actions (ami)", 1, function (screen) {
      feuilleActions(screen, "Commentaire de Julie",
        "« La veste avec les baskets blanches, parfait pour Lisbonne ! »",
        [["Répondre", "normal"], ["Masquer ce commentaire", "normal"], ["Signaler", "danger"], ["Annuler", "normal"]]);
    }, 0);

    // 3. Actions sur mon commentaire (overlay)
    ecranNouveau(COL, "Collection — Commentaire · Actions (le mien)", 2, function (screen) {
      feuilleActions(screen, "Ton commentaire", "« C'est exactement l'idée. »",
        [["Modifier", "normal"], ["Supprimer mon commentaire", "danger"], ["Annuler", "normal"]]);
    }, 0);

    // 4. Confirmation de suppression (overlay)
    ecranNouveau(COL, "Collection — Confirmation · Supprimer un commentaire", 3, function (screen) {
      modale(screen, "Supprimer ton commentaire ?",
        "Il disparaît pour toutes les personnes qui ont accès à la collection.", "Supprimer",
        "Les réponses de tes amis restent visibles.");
    }, 0);

    // 5. Commentaire masqué
    ecranNouveau(COL, "Collection — Commentaire masqué", 4, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastInfo("Commentaire masqué", "Julie n'est pas prévenue. Il n'est plus visible sur ta collection.", C.sub)]);
      lien(col, "Annuler le masquage");
      addFill(col, titrePage("Commentaires", NOM + " · 2 visibles"));
      liste(col, "Sur la collection", null, [
        commentaireMenu("Mathis", 0, "C'est exactement l'idée.", "il y a 2 h", true, "Toi")
      ]);
      liste(col, "Sur la Veste en jean", null, [
        commentaireMenu("Thomas", 0, "Tu me la prêtes pour samedi ?", "il y a 20 min", false)
      ]);
      barreActions(col, bouton("Retour à la collection", "primary"), null, null, null);
      finaliser(screen, col);
    }, 0);

    // 6. Commentaire supprimé
    ecranNouveau(COL, "Collection — Commentaire supprimé", 5, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Commentaire supprimé", "Il a disparu pour tout le monde.")]);
      addFill(col, titrePage("Commentaires", NOM + " · 2 commentaires"));
      liste(col, "Sur la collection", null, [
        commentaireMenu("Julie", 1, "La veste avec les baskets blanches, parfait pour Lisbonne !", "hier", false)
      ]);
      barreActions(col, bouton("Retour à la collection", "primary"), null, null, null);
      finaliser(screen, col);
    }, 0);

    // 7. Commentaire publié (vue ami)
    ecranNouveau(COL, "Collection — Commentaire publié", 0, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Commentaire publié !", "Rafael et ses amis autorisés le voient.")]);
      addFill(col, titrePage(NOM, "Collection de Rafael · 3 commentaires"));
      liste(col, "Commentaires", "3", [
        commentaireMenu("Julie", 1, "La veste avec les baskets blanches, parfait pour Lisbonne !", "hier", false),
        commentaireMenu("Rafael", 2, "C'est exactement l'idée.", "il y a 2 h", false),
        commentaireMenu("Mathis", 0, "Je valide le foulard, il change tout.", "à l'instant", true, "Toi")
      ]);
      barreActions(col, bouton("Retour à la collection", "primary"), null, null, null);
      finaliser(screen, col);
    }, 1);

    // 8. Aucun commentaire (vue ami)
    ecranNouveau(COL, "Collection — Commentaires · Aucun commentaire", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage(NOM, "Collection de Rafael · 0 commentaire"));
      blocs(col, [miniMood(UTIL)]);
      const vide = frame("Empty state", { dir: "VERTICAL", gap: S.sm, px: GUT, pt: S.lg, align: "CENTER" });
      vide.appendChild(para("Pas encore de commentaire", UTIL, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      vide.appendChild(para("Sois le premier à réagir. Seuls Rafael et ses amis autorisés le verront.", UTIL - S.xl, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(col, vide);
      champCommentaire(col);
      barreActions(col, bouton("Publier", "primary"), null, null, null);
      finaliser(screen, col);
    }, 1);

    // 9. Commentaires désactivés (vue ami)
    ecranNouveau(COL, "Collection — Commentaires · Désactivés", 2, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      blocs(col, [moodboard(MOOD, UTIL, 6, "Moodboard").node]);
      addFill(col, titrePage(NOM, "Collection de Rafael · 12 éléments"));
      blocs(col, [bandeauPrive("Rafael a désactivé les commentaires sur cette collection. Tu peux toujours la consulter.")]);
      barreActions(col, bouton("Fermer", "secondary"), null, null, null);
      finaliser(screen, col);
    }, 1);

    // 10. Commenter une pièce précise (vue ami)
    ecranNouveau(COL, "Collection — Pièce · Commentaires", 3, function (screen) {
      const col = preparer(screen, 40, 0);
      const hero = frame("Detail/Hero photo", {
        dir: "VERTICAL", w: W, h: 300, primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER", clip: true
      });
      hero.appendChild(photoBox(200, 200, R.lg, P.jacket, C.ink));
      col.appendChild(hero);
      overlay(hero, boutonRetour("<"), GUT, S.xl);
      addFill(col, titrePage("Veste en jean", "Dans « " + NOM + " » · À la une"));
      blocs(col, [pastillesRelation([["Ami autorisé", "encours"], ["Commentaires autorisés", "encours"]])]);
      liste(col, "Sur cette pièce", "2", [
        commentaireMenu("Thomas", 0, "Tu me la prêtes pour samedi ?", "il y a 20 min", false),
        commentaireMenu("Rafael", 2, "Si tu me la rends dimanche, oui.", "il y a 5 min", false)
      ]);
      champCommentaire(col, "Commenter la veste...");
      barreActions(col, bouton("Publier", "primary"), null, null,
        "Ce commentaire porte sur la veste, pas sur toute la collection.");
      finaliser(screen, col);
    }, 1);

    // 11. Une pièce vue par un abonné (sans commentaires)
    ecranNouveau(COL, "Collection — Pièce · Vue abonné", 4, function (screen) {
      const col = preparer(screen, 40, 0);
      const hero = frame("Detail/Hero photo", {
        dir: "VERTICAL", w: W, h: 300, primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER", clip: true
      });
      hero.appendChild(photoBox(200, 200, R.lg, P.jacket, C.ink));
      col.appendChild(hero);
      overlay(hero, boutonRetour("<"), GUT, S.xl);
      addFill(col, titrePage("Veste en jean", "Dans « " + NOM + " »"));
      blocs(col, [
        pastillesRelation([["Abonné autorisé", "neutre"], ["Lecture seule", "neutre"]]),
        carteSection("La pièce", [ligneInfo("Marque", "Levi's"), ligneInfo("Taille", "L")]),
        bandeauPrive("Les commentaires sont réservés aux amis autorisés de Rafael.")
      ]);
      barreActions(col, bouton("Fermer", "secondary"), null, null, null);
      finaliser(screen, col);
    }, 1);

    // ============ SECTION 16 — FIL D'ACTUALITÉ ============

    const ONGLETS_FIL = ["Fil", "Mes publications"];

    // 12. Fil d'actualité
    ecranNouveau(FIL, "Fil — Fil d'actualité", 0, function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Fil d'actualité", "Ce que tes amis ont choisi de te montrer"));
      addFill(col, ongletsN(ONGLETS_FIL, 0));
      const act = frame("Filtres", { dir: "HORIZONTAL", px: GUT, justify: "MAX" });
      act.appendChild(text("+ Publier", { font: FONT_LB, size: 12, color: C.primary }));
      addFill(col, act);
      blocs(col, [
        cartePost("Rafael", 2, "il y a 2 h", "Amis autorisés", "encours",
          "Ma collection pour cet été est prête. Vos avis ?", miniMood(UTIL_CARTE_LIB), "Commenter (3)", "Voir la collection ›"),
        cartePost("Thomas", 0, "hier", "Amis autorisés", "encours",
          "Je prête ma tente 2 places pour le week-end, si quelqu'un en a besoin.",
          photoBox(UTIL_CARTE_LIB, 160, R.md, P.coat, C.ink), "Commenter (1)", null),
        cartePost("Julie", 1, "il y a 2 j", "Abonnés autorisés · lecture seule", "neutre",
          "Nouvelle tenue pour le mariage de ma sœur.", photoBox(UTIL_CARTE_LIB, 160, R.md, P.robe, C.ink), null, null)
      ]);
      blocs(col, [bandeauPrive("Pas d'inconnus ni de publicité : seules les personnes qui t'ont choisi apparaissent ici.")]);
      finaliser(screen, col);
      poserNav(screen, null);
    });

    // 13. Fil vide
    ecranNouveau(FIL, "Fil — État · Fil vide", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Fil d'actualité", "Rien pour l'instant"));
      const bloc = frame("Empty state", { dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER" });
      bloc.appendChild(moodboard(MOOD_MINI, 180, 6, "Illustration").node);
      const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      txt.appendChild(para("Ton fil est calme", UTIL, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      txt.appendChild(para("Tes amis n'ont rien partagé avec toi. Tu peux montrer une collection ou une tenue à qui tu veux.", UTIL - S.xl, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bloc, txt);
      const a = frame("Action", { dir: "VERTICAL", pt: S.sm });
      a.appendChild(bouton("Publier quelque chose", "primary"));
      bloc.appendChild(a);
      addFill(col, bloc);
      finaliser(screen, col);
    });

    // 14. Publier
    ecranNouveau(FIL, "Fil — Publier", 2, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Publier", "Choisis quoi montrer, et à qui"));
      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, groupeChips("Ce que tu montres", ["Collection", "Objet", "Tenue", "Photo"], ["Collection"]));
      addFill(col, champs);
      const q = frame("Blocs", { dir: "VERTICAL", gap: S.sm, px: GUT });
      addFill(q, carteElement(NOM, "12 éléments · privée", P.jacket, null, null));
      const ch = frame("Lien", { dir: "HORIZONTAL", justify: "MAX" });
      ch.appendChild(text("Changer ›", { font: FONT_LB, size: 12, color: C.primary }));
      addFill(q, ch);
      addFill(col, q);
      const t = frame("Champs", { dir: "VERTICAL", px: GUT });
      addFill(t, champTexte("Ton message (facultatif)", "Ma collection pour cet été est prête. Vos avis ?", 88));
      addFill(col, t);
      liste(col, "Qui peut voir", null, [
        rangeeAcces("Amis", "12 amis", 0, "Commentaires", true),
        rangeeAcces("Abonnés", "5 abonnés", 2, "Lecture seule", false)
      ]);
      blocs(col, [ligneToggle("Autoriser les commentaires", "Amis choisis uniquement · jamais les abonnés", true)]);
      barreActions(col, bouton("Publier", "primary"), null, null,
        "Rien n'est public. Supprimer la publication ne supprime pas la collection.");
      finaliser(screen, col);
    });

    // 15. Publication publiée
    ecranNouveau(FIL, "Fil — Publication publiée", 3, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Publié !", "Tes 12 amis peuvent la voir dans leur fil.")]);
      addFill(col, titrePage("Ta publication", "À l'instant"));
      blocs(col, [cartePost("Mathis", 0, "à l'instant", "Amis autorisés", "encours",
        "Ma collection pour cet été est prête. Vos avis ?", miniMood(UTIL_CARTE_LIB), null, "Voir la collection ›")]);
      barreActions(col, bouton("Voir mes publications", "primary"), [bouton("Retour au fil", "secondary")], null, null);
      finaliser(screen, col);
    });

    // 16. Publication (détail + commentaires, vue ami)
    ecranNouveau(FIL, "Fil — Publication", 4, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      blocs(col, [cartePost("Rafael", 2, "il y a 2 h", "Amis autorisés", "encours",
        "Ma collection pour cet été est prête. Vos avis ?", miniMood(UTIL_CARTE_LIB), null, "Voir la collection ›")]);
      liste(col, "Commentaires", "3", [
        commentaireMenu("Julie", 1, "La veste avec les baskets blanches, parfait pour Lisbonne !", "hier", false),
        commentaireMenu("Thomas", 0, "Tu me prêtes la veste ?", "il y a 1 h", false),
        commentaireMenu("Rafael", 2, "Oui, dis-moi quand.", "il y a 40 min", false)
      ]);
      champCommentaire(col);
      barreActions(col, bouton("Publier", "primary"), null, null,
        "Seuls Rafael et ses amis autorisés voient ces commentaires.");
      finaliser(screen, col);
    });

    // 17. Publication vue par un abonné
    ecranNouveau(FIL, "Fil — Publication · Vue abonné", 5, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      blocs(col, [
        cartePost("Julie", 1, "il y a 2 j", "Abonnés autorisés · lecture seule", "neutre",
          "Nouvelle tenue pour le mariage de ma sœur.", photoBox(UTIL_CARTE_LIB, 220, R.md, P.robe, C.ink), null, null),
        bandeauPrive("Tu suis Julie : elle a choisi de te montrer cette publication, en lecture seule. Les commentaires sont réservés à ses amis.")
      ]);
      barreActions(col, bouton("Fermer", "secondary"), null, null, null);
      finaliser(screen, col);
    });

    // 18. Mes publications
    ecranNouveau(FIL, "Fil — Mes publications", 0, function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes publications", "3 publications · aucune publique"));
      addFill(col, ongletsN(ONGLETS_FIL, 1));
      blocs(col, [
        cartePost("Mathis", 0, "à l'instant", "Amis autorisés", "encours",
          "Ma collection pour cet été est prête. Vos avis ?", miniMood(UTIL_CARTE_LIB), "3 commentaires", null),
        cartePost("Mathis", 0, "8 sept.", "Amis et abonnés autorisés", "neutre",
          "Perceuse dispo pour les travaux du week-end.", photoBox(UTIL_CARTE_LIB, 140, R.md, P.pants, C.ink), "Commentaires désactivés", null)
      ]);
      finaliser(screen, col);
      poserNav(screen, null);
    }, 1);

    // 19. Actions sur ma publication (overlay)
    ecranNouveau(FIL, "Fil — Publication · Actions", 1, function (screen) {
      feuilleActions(screen, "Ta publication", "« Ma collection pour cet été est prête. Vos avis ? »",
        [["Modifier le message", "normal"], ["Changer qui peut voir", "normal"],
         ["Désactiver les commentaires", "normal"], ["Supprimer la publication", "danger"], ["Annuler", "normal"]]);
    }, 1);

    // 20. Supprimer une publication (overlay)
    ecranNouveau(FIL, "Fil — Confirmation · Supprimer une publication", 2, function (screen) {
      modale(screen, "Supprimer la publication ?",
        "Elle disparaît du fil de tes amis, avec ses commentaires.", "Supprimer",
        "La collection « " + NOM + " » n'est pas supprimée : elle reste dans ta penderie, avec ses partages.");
    }, 1);

    // 21. Signaler un contenu (commentaire ou publication)
    ecranNouveau(FIL, "Fil — Signaler un contenu", 3, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Signaler", "Commentaire de Julie"));
      blocs(col, [commentaire("Julie", 1, "La veste avec les baskets blanches, parfait pour Lisbonne !", "hier", false)]);
      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, groupeChips("Pourquoi ?", ["Harcèlement", "Contenu inapproprié", "Spam", "Autre"], ["Contenu inapproprié"]));
      addFill(champs, champTexte("Précisions (facultatif)", "Ajoute un détail pour aider l'équipe.", 72));
      addFill(col, champs);
      blocs(col, [bandeauPrive("L'équipe Penderie examine chaque signalement. La personne concernée ne sait pas qui l'a signalée.")]);
      barreActions(col, bouton("Envoyer le signalement", "primary"), null, null, null);
      finaliser(screen, col);
    }, 1);

    // 22. Contenu signalé
    ecranNouveau(FIL, "Fil — Contenu signalé", 4, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Signalement envoyé", "Merci. Le contenu est masqué pour toi en attendant.")]);
      addFill(col, titrePage("Et maintenant ?", "Signalement #SIG-0193"));
      blocs(col, [carteSection("Ce qui se passe", [
        ligneInfo("L'équipe examine", "Sous 24 h"),
        ligneInfo("Tu es prévenu", "De la décision"),
        ligneInfo("Julie", "Ne sait pas qui a signalé")
      ])]);
      barreActions(col, bouton("Retour au fil", "primary"), null, null, null);
      finaliser(screen, col);
    }, 1);

    rapport("Lot 27 Commentaires et fil");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
