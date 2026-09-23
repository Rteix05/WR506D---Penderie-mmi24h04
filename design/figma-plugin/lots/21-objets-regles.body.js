// ============================================================
// Lot 21 — RÈGLES MÉTIER : OBJETS, PRÊTS, LOCALISATION
// (page "Maquette v2", sections 03 INVENTAIRE / OBJETS et 07 PRÊTS)
//
// Audit du brief avant construction (points 8 à 12, 17, 18, 19) :
//   [COUVERT] Fiche Disponible / Prêté / Emprunté, Statuts, Déplacer,
//             Scanner -> Résultat -> Informations -> ... -> Confirmation
//   [PARTIEL] 8 états (Statuts n'en décrit que 6)          -> lot 12 adapté
//             Emprunté sans la raison ni le bon propriétaire -> lot 02 adapté
//             Prêté : vente retirée sans explication        -> lot 02 adapté
//             Déplacer : pas d'exemple entre logements       -> lot 12 adapté
//             Scan : pas d'étape de détection               -> NOUVEAU
//   [MANQUANT] fiches Perdu, Endommagé, Vendu, À ranger ; historique des
//             prêts ; signaler un problème ; perte confirmée ; retour
//             endommagé ; objet non rendu ; déplacement confirmé ; scan
//             échoué ; notes et souvenir                    -> NOUVEAUX
//
// 13 écrans NOUVEAUX. Aucun doublon : chaque nom a été vérifié contre les
// 142 frames existantes. Aucun composant nouveau : les états « À ranger »,
// « Perdu », « Endommagé » sont des tons de la pastille existante, ajoutés
// au set « Status / Object » par le catalogue (lot 16).
//
// Règles rendues visibles :
//   - « Déplacer » est une action : l'emplacement change, l'état reste
//   - Emprunté : « Tu ne peux pas prêter cet objet car il appartient à Thomas »
//   - Perdu : ni prêt, ni vente, ni déplacement tant qu'il n'est pas retrouvé
//   - Endommagé : pas de prêt tant qu'il n'est pas réparé
//   - Vendu : plus aucune action, historique conservé
//
// Libellés cliquables câblés dans penderie-prototype-v2.js : voir la
// section « 21 » du prototype.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 21 Règles objets : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();
    const PIC = await chargerPics();

    const OBJETS = "OBJETS";
    const PRETS = "PRETS";
    const OBJ = "Perceuse Bosch";
    const OBJ_PIC = PIC.pants;
    const LOC = "Maison principale › Garage › Étagère 2 › Carton Bricolage";

    // ---------- briques ----------

    function heroFiche(col, nom, categorie, statut, tone, pic) {
      const hero = frame("Detail/Hero photo", {
        dir: "VERTICAL", w: W, h: 300, primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER", clip: true
      });
      if (pic) {
        try {
          const inst = pic.createInstance();
          inst.rescale(190 / Math.max(inst.width, inst.height));
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
      g.appendChild(text(categorie, { size: 12, color: C.sub }));
      ligne.appendChild(g);
      ligne.appendChild(statusPill(statut, tone));
      addFill(tete, ligne);
      addFill(col, tete);
    }

    function blocTexte(titre, corps, lien, gras) {
      const c = card("Card/Section/" + titre, { gap: S.sm });
      c.appendChild(text(titre, { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(corps, UTIL_CARTE_LIB, { font: gras ? FONT_LB : FONT_L, size: 16, color: C.ink, lineHeight: 22 }));
      if (lien) c.appendChild(text(lien, { size: 12, color: C.primary }));
      return c;
    }

    // Le « pourquoi » d'une action impossible, toujours au même endroit :
    // juste au-dessus des boutons, sur fond teinté de la couleur de l'état.
    function raisonBlocage(texte, tone) {
      const t = TONES[tone] || TONES.neutre;
      const b = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const r = frame("Badge/Blocage", {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.lg, py: S.md, align: "CENTER",
        fill: t[0], fillOpacity: t[1]
      });
      const rond = frame("Pastille", {
        w: 32, h: 32, radius: R.full, fill: t[0], dir: "VERTICAL",
        align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      rond.appendChild(text("!", { font: FONT_LB, size: 14, color: C.white }));
      r.appendChild(rond);
      r.appendChild(para(texte, UTIL - S.lg * 2 - 44, { font: FONT_LB, size: 12, color: t[2], lineHeight: 16 }));
      addFill(b, r);
      return b;
    }

    function choix(label, sous, actif) {
      const r = frame("List/Row/" + label, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: actif ? C.primary : C.white,
        fillOpacity: actif ? 0.06 : 1, px: S.lg, py: S.md, align: "CENTER",
        justify: "SPACE_BETWEEN", shadow: actif ? null : SHADOW_E1
      });
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(label, { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para(sous, 220, { size: 12, color: C.sub, lineHeight: 16 }));
      r.appendChild(g);
      r.appendChild(actif ? statusPill("Choisi", "arendre")
        : frame("Radio", { w: 20, h: 20, radius: R.full, fill: C.ink, fillOpacity: 0.08,
                           dir: "VERTICAL", primary: "FIXED", counter: "FIXED" }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    // Une ligne de l'historique : événement, date, et le détail utile
    function evenement(titre, date, detail, tone, statut) {
      const r = frame("Detail/History item/" + titre, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "MIN", shadow: SHADOW_E1
      });
      const pas = frame("Pastille", {
        w: 12, h: 12, radius: R.full, fill: couleurDe(tone),
        dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
      });
      const pw = frame("Repere", { dir: "VERTICAL", pt: S.xs });
      pw.appendChild(pas);
      r.appendChild(pw);
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      const tete = frame("Ligne", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER", justify: "SPACE_BETWEEN" });
      tete.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
      tete.appendChild(text(date, { size: 12, color: C.sub }));
      addFill(g, tete);
      if (detail) g.appendChild(para(detail, UTIL - S.md * 3 - 12, { size: 12, color: C.sub, lineHeight: 16 }));
      if (statut) {
        const p = frame("Statuts", { dir: "HORIZONTAL" });
        p.appendChild(statusPill(statut, tone));
        g.appendChild(p);
      }
      r.appendChild(g);
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

    function blocs(col, noeuds) {
      const b = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < noeuds.length; i++) addFill(b, noeuds[i]);
      addFill(col, b);
    }

    // ============ SECTION 03 — FICHES D'ÉTAT ============

    // 1. Perdu
    ecranNouveau(OBJETS, "Objet — Fiche · Perdu", 0, function (screen) {
      const col = preparer(screen, 40, 0);
      heroFiche(col, OBJ, "Outils", "Perdu", "perdu", OBJ_PIC);
      blocs(col, [
        carteSection("Perdu pendant un prêt", [
          ligneInfo("Prêté à", "Thomas"),
          ligneInfo("Depuis le", "12 sept. 2026"),
          ligneInfo("Déclaré perdu le", "22 sept. 2026")
        ]),
        blocTexte("Dernier emplacement connu", "Chez Thomas", null, true),
        blocTexte("Emplacement habituel", LOC, null, false),
        lienRangee("Historique des prêts", "3 prêts · le dernier est clôturé")
      ]);
      addFill(col, raisonBlocage("Objet perdu : impossible de le prêter, de le vendre ou de le déplacer tant qu'il n'est pas retrouvé.", "perdu"));
      barreActions(col,
        bouton("Marquer comme retrouvé", "primary"),
        [bouton("Prêter", "disabled"), bouton("Vendre", "disabled")],
        null, "Retrouvé, il repasse en « Disponible » à son emplacement habituel.");
      finaliser(screen, col);
    });

    // 2. Endommagé
    ecranNouveau(OBJETS, "Objet — Fiche · Endommagé", 1, function (screen) {
      const col = preparer(screen, 40, 0);
      heroFiche(col, OBJ, "Outils", "Endommagé", "endommage", OBJ_PIC);
      blocs(col, [
        carteSection("Endommagé au retour d'un prêt", [
          ligneInfo("Prêté à", "Thomas"),
          ligneInfo("Rendu le", "20 sept. 2026"),
          ligneInfo("État au retour", "Endommagé")
        ]),
        blocTexte("Ce qui ne va pas", "Le mandrin accroche et la batterie ne tient plus la charge.", null, false),
        blocTexte("Localisation", LOC, "Déplacer l'objet ›", true),
        lienRangee("Historique des prêts", "3 prêts · dommage signalé le 20 sept.")
      ]);
      addFill(col, raisonBlocage("Objet endommagé : pas de prêt ni de vente tant qu'il n'est pas réparé.", "endommage"));
      barreActions(col,
        bouton("Marquer comme réparé", "primary"),
        [bouton("Prêter", "disabled"), bouton("Modifier", "secondary")],
        null, null);
      finaliser(screen, col);
    });

    // 3. Vendu
    ecranNouveau(OBJETS, "Objet — Fiche · Vendu", 2, function (screen) {
      const col = preparer(screen, 40, 0);
      heroFiche(col, "Enceinte Marshall", "Électronique", "Vendu", "vendu", PIC.cap);
      blocs(col, [
        carteSection("Vente", [
          ligneInfo("Vendue à", "Julie"),
          ligneInfo("Le", "3 sept. 2026"),
          ligneInfo("Prix", "60 €"),
          ligneInfo("Remise", "En main propre")
        ]),
        blocTexte("Dernier emplacement", "Maison principale › Salon › Meuble TV", null, false),
        lienRangee("Historique des prêts", "1 prêt avant la vente")
      ]);
      addFill(col, raisonBlocage("Objet vendu : il ne peut plus être prêté, déplacé ni remis en vente. Il n'apparaît plus dans tes objets disponibles.", "vendu"));
      barreActions(col,
        bouton("Voir l'historique", "primary"),
        [bouton("Prêter", "disabled"), bouton("Déplacer", "disabled")],
        null, "Son historique reste consultable.");
      finaliser(screen, col);
    });

    // 4. À ranger (pas encore d'emplacement précis)
    ecranNouveau(OBJETS, "Objet — Fiche · À ranger", 3, function (screen) {
      const col = preparer(screen, 40, 0);
      heroFiche(col, "Casque JBL", "Électronique", "À ranger", "aranger", PIC.cap);
      blocs(col, [
        blocTexte("Emplacement", "Pas encore d'emplacement précis", null, true),
        carteSection("Ce qu'on sait", [
          ligneInfo("Logement", "Maison principale"),
          ligneInfo("Pièce", "Non renseignée"),
          ligneInfo("Rangement", "Non renseigné")
        ])
      ]);
      addFill(col, raisonBlocage("Un objet sans emplacement ne se retrouve pas : range-le pour qu'il passe en « Disponible ».", "aranger"));
      barreActions(col,
        bouton("Ranger", "primary"),
        [bouton("Prêter", "secondary"), bouton("Vendre", "secondary")],
        "Supprimer cet objet", null);
      finaliser(screen, col);
    });

    // 5. Historique des prêts (et des déplacements)
    ecranNouveau(OBJETS, "Objet — Historique des prêts", 4, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Historique", OBJ + " · 3 prêts"));
      blocs(col, [carteSection("En résumé", [
        ligneInfo("Prêts", "3"),
        ligneInfo("Jours prêtés", "20"),
        ligneInfo("Retards", "0")
      ])]);
      liste(col, "Prêts", null, [
        evenement("Prêtée à Thomas", "12 sept.", "Retour prévu le 20 sept. · 8 jours", "encours", "En cours"),
        evenement("Rendue par Julie", "20 juil.", "Prêtée le 15 juil. · 5 jours · rayure légère sur le boîtier", "termine", "Terminé"),
        evenement("Rendue par Thomas", "10 juin", "Prêtée le 3 juin · 7 jours · bon état · « merci ! »", "termine", "Terminé")
      ]);
      liste(col, "Emplacements", null, [
        evenement("Rangée au Garage", "4 avril", "Maison principale › Garage › Étagère 2 › Carton Bricolage", "dispo", null),
        evenement("Ajoutée à ta penderie", "2 avril", "Par scan · Maison principale › Entrée", "dispo", null)
      ]);
      finaliser(screen, col);
    });

    // 6. Déplacement confirmé (l'action, pas un état)
    ecranNouveau(OBJETS, "Objet — Déplacé · Confirmation", 5, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Objet déplacé !", "Studio de Léa › Salon › Placard")]);
      addFill(col, titrePage(OBJ, "Disponible · nouvel emplacement"));
      const sec = frame("Section/Actuel", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Emplacement actuel", null));
      addFill(sec, filAriane(["Studio de Léa", "Salon", "Placard"], true));
      addFill(col, sec);
      blocs(col, [
        carteElement(OBJ, "Studio de Léa › Salon › Placard", OBJ_PIC, "Disponible", "dispo"),
        carteSection("Ce qui a changé", [
          ligneInfo("Avant", "Maison principale › Garage"),
          ligneInfo("État", "Inchangé : Disponible"),
          ligneInfo("Carton Bricolage", "12 → 11 objets")
        ])
      ]);
      barreActions(col,
        bouton("Voir l'objet", "primary"),
        [bouton("Annuler le déplacement", "secondary")], null,
        "Le déplacement est gardé dans l'historique de l'objet.");
      finaliser(screen, col);
    });

    // 7. Scan — analyse en cours
    ecranNouveau(OBJETS, "Objet — Scan · Analyse en cours", 6, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("On analyse ta photo", "Quelques secondes"));
      blocs(col, [zonePhoto(360, OBJ_PIC, "Analyse en cours…")]);
      addFill(col, jauge(4, 1));
      blocs(col, [carteSection("On cherche", [
        ligneInfo("Le type d'objet", "Trouvé"),
        ligneInfo("La marque", "En cours"),
        ligneInfo("L'état", "En attente")
      ])]);
      barreActions(col, bouton("Ajouter manuellement", "secondary"), null, null,
        "Tu peux passer à la saisie manuelle à tout moment.");
      finaliser(screen, col);
    });

    // 8. Scan — échec
    ecranNouveau(OBJETS, "Objet — Scan · Échec", 7, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      blocs(col, [toastInfo("Impossible d'identifier cet objet", "Ta photo est gardée pour la suite.", C.error)]);
      addFill(col, titrePage("Pas reconnu", "Ça arrive, tu n'es pas bloqué"));
      blocs(col, [
        zonePhoto(200, OBJ_PIC, null),
        carteSection("Pour un meilleur résultat", [
          ligneInfo("Lumière", "Pas de contre-jour"),
          ligneInfo("Cadrage", "L'objet en entier"),
          ligneInfo("Étiquette", "Visible si possible")
        ])
      ]);
      barreActions(col,
        bouton("Réessayer", "primary"),
        [bouton("Ajouter manuellement", "secondary")], null,
        "En manuel, ta photo est déjà ajoutée : il reste le nom et la catégorie.");
      finaliser(screen, col);
    });

    // 9. Notes et souvenir
    ecranNouveau(OBJETS, "Objet — Notes et souvenir", 8, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Notes et souvenir", OBJ));
      blocs(col, [zonePhoto(160, OBJ_PIC, "2 photos · Ajouter une photo")]);
      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champTexte("Note", "Les mèches sont dans la boîte bleue.", 72));
      addFill(champs, champTexte("Souvenir", "Offerte par mon grand-père pour mon premier appartement.", 88));
      addFill(champs, champSelect("Informations complémentaires", "Achetée en 2019 · garantie jusqu'en 2026"));
      addFill(col, champs);
      blocs(col, [bandeauPrive("Le souvenir reste privé, même si l'objet est partagé ou prêté.")]);
      barreActions(col, bouton("Enregistrer", "primary"), null,
        "Effacer la note et le souvenir", null);
      finaliser(screen, col);
    });

    // ============ SECTION 07 — INCIDENTS DE PRÊT ============

    // 10. Signaler un problème
    ecranNouveau(PRETS, "Prêt — Signaler un problème", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Un problème ?", OBJ + " · prêtée à Thomas"));
      blocs(col, [carteElement(OBJ, "Chez Thomas depuis le 12 septembre", OBJ_PIC, "Prêté", "prete")]);
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, choix("Objet perdu", "Thomas ne le retrouve plus", true));
      addFill(l, choix("Objet endommagé", "Il est abîmé ou ne fonctionne plus", false));
      addFill(l, choix("Objet non rendu", "La date de retour est dépassée", false));
      addFill(col, l);
      const champs = frame("Champs", { dir: "VERTICAL", px: GUT });
      addFill(champs, champTexte("Ce qui s'est passé (facultatif)", "Oubliée sur un chantier, Thomas l'a cherchée partout.", 72));
      addFill(col, champs);
      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Rien ne change tant que tu n'as pas confirmé.");
      finaliser(screen, col);
    });

    // 11. Confirmation perte (overlay)
    ecranNouveau(PRETS, "Prêt — Confirmation · Objet perdu", 1, function (screen) {
      modale(screen,
        "Déclarer la perceuse perdue ?",
        "La Perceuse Bosch passera en « Perdu » : plus de prêt, de vente ni de déplacement tant qu'elle n'est pas retrouvée.",
        "Déclarer perdue",
        "Le prêt à Thomas est clôturé et reste dans l'historique. Thomas est prévenu. Tu pourras la marquer comme retrouvée.");
    });

    // 12. Retour d'un objet endommagé
    ecranNouveau(PRETS, "Prêt — Retour · Objet endommagé", 2, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("État au retour", OBJ + " · rendue par Thomas"));
      blocs(col, [carteSection("Le prêt", [
        ligneInfo("Prêté le", "12 sept. 2026"),
        ligneInfo("Rendu le", "20 sept. 2026"),
        ligneInfo("Durée", "8 jours")
      ])]);
      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, groupeChips("Dans quel état ?", ["Comme avant", "Légèrement abîmé", "Endommagé"], ["Endommagé"]));
      addFill(champs, champTexte("Ce qui ne va pas", "Le mandrin accroche et la batterie ne tient plus la charge.", 72));
      addFill(col, champs);
      blocs(col, [zonePhoto(140, OBJ_PIC, "Ajouter une photo du dommage")]);
      barreActions(col, bouton("Confirmer le retour", "primary"), null, null,
        "L'objet repassera en « Endommagé » : pas de prêt tant qu'il n'est pas réparé. Thomas voit ta note.");
      finaliser(screen, col);
    });

    // 13. Objet non rendu (retard)
    ecranNouveau(PRETS, "Prêt — Objet non rendu", 3, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Pas encore rendue", "Tondeuse · prêtée à Julie"));
      blocs(col, [
        carteElement("Tondeuse", "Chez Julie depuis le 28 août", PIC.coat, "En retard", "retard"),
        carteSection("Le prêt", [
          ligneInfo("Retour prévu", "5 sept. 2026"),
          ligneInfo("Retard", "17 jours"),
          ligneInfo("Relances", "1 · le 8 sept.")
        ])
      ]);
      addFill(col, raisonBlocage("Tant qu'elle n'est pas rendue, la tondeuse reste « Prêté » : ni nouveau prêt, ni vente.", "retard"));
      barreActions(col,
        bouton("Relancer Julie", "primary"),
        [bouton("Prolonger le prêt", "secondary")],
        "Déclarer perdue", null);
      finaliser(screen, col);
    });

    rapport("Lot 21 Règles objets");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
