// ============================================================
// Lot 20 — ABONNÉS  (page "Maquette v2", section 08 « AMIS & ABONNÉS »)
//
// 11 écrans NOUVEAUX, en deux rangées sous les écrans Amis :
//   rangée 1 — le profil d'une personne et ses états de relation
//     Inès : Non abonné -> Abonnement confirmé -> Abonné -> (Se désabonner)
//     Paul : Abonné à toi -> Mutuel · Proposition ami -> Mutuel · Demande envoyée
//   rangée 2 — Mes abonnés, Mes abonnements, et leurs états vides
//
// + 1 composant NOUVEAU sur la page Components : le set « Button / Relation »
//   (6 variantes). Seul composant réellement manquant : le bouton de 52 px
//   ne tient pas à côté d'un avatar dans une rangée de personne.
//   Créé une seule fois, repéré par pluginData, jamais effacé : les
//   instances posées dans les écrans restent donc reliées à relance.
//
// Adaptations des parcours existants (dans leurs propres lots) :
//   lot 06 : onglets Amis / Abonnés / Abonnements sur « Mes amis »,
//            compteurs + état de relation sur « Profil ami » (= état « amis »)
//   lot 11 : 4 notifications de relation dans « Notifications — Liste »
//   lot 19 : préfixe « Abonnés » rangé dans la section 08
//
// Règles métier rendues visibles dans l'UI :
//   - s'abonner ne crée pas d'amitié, ne donne accès à rien de privé
//   - se désabonner ne retire jamais un ami
//   - l'abonnement mutuel PROPOSE « Devenir amis », n'ajoute rien
//   - une demande d'ami est toujours un geste explicite
//
// Libellés cliquables câblés dans penderie-prototype-v2.js :
// « S'abonner », « Abonné », « Demander en ami », « Abonnement confirmé ! »,
// « Se désabonner », « S'abonner en retour », « Devenir amis », « Plus tard »,
// « Demande d'ami envoyée ! », « Annuler la demande », « Voir mes amis »,
// « Paul », « Thomas », « Inès », « Ami » ;
// onglets par nom de calque : « Nav/Tab/Amis (12)/Inactif »,
// « Nav/Tab/Abonnés (5)/Inactif », « Nav/Tab/Abonnements (4)/Inactif ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 20 Abonnés : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();

    const SECTION = "AMIS";
    const ONGLETS_RELATIONS = ["Amis (12)", "Abonnés (5)", "Abonnements (4)"];

    // ---------- la section englobe désormais les abonnements ----------
    const sec = sectionParNom(SECTION);
    if (sec && norme(sec.name).indexOf("abonnes") === -1) {
      sec.name = "08 — AMIS & ABONNÉS";
    }

    // ---------- composant « Button / Relation » sur Components ----------
    const MARQUE_REL = "penderie-relation";
    const ETATS = Object.keys(RELATION);
    const VARIANTES = {};
    let compCree = false;

    const pageComp = figma.root.children.filter(function (p) {
      return /component/i.test(p.name);
    })[0];
    if (pageComp) {
      await pageComp.loadAsync();
      let set = null;
      for (let i = 0; i < pageComp.children.length; i++) {
        const n = pageComp.children[i];
        if (n.type === "COMPONENT_SET" && n.name === "Button / Relation") { set = n; break; }
      }
      if (!set) {
        let bas = 0, gauche = null;
        for (let i = 0; i < pageComp.children.length; i++) {
          const n = pageComp.children[i];
          if (typeof n.y !== "number") continue;
          bas = Math.max(bas, n.y + (n.height || 0));
          gauche = gauche == null ? n.x : Math.min(gauche, n.x);
        }
        const x0 = gauche == null ? 0 : gauche;

        // même mise en scène que le catalogue (lot 16) : titre + set
        const titre = figma.createText();
        titre.fontName = FONT_T;
        titre.characters = "DS v2 · Relations";
        titre.fontSize = 32;
        titre.fills = solid(C.ink);
        titre.textAutoResize = "WIDTH_AND_HEIGHT";
        titre.name = "Titre · Relations";
        pageComp.appendChild(titre);
        titre.x = x0; titre.y = bas + 400;
        titre.setPluginData(MARQUE_REL, "1");

        const comps = [];
        for (let i = 0; i < ETATS.length; i++) {
          const f = boutonRelation(ETATS[i]);
          pageComp.appendChild(f);              // createComponentFromNode veut un noeud posé
          const c = figma.createComponentFromNode(f);
          c.name = "État=" + ETATS[i];
          comps.push(c);
        }
        set = figma.combineAsVariants(comps, pageComp);
        set.name = "Button / Relation";
        set.layoutMode = "HORIZONTAL";
        set.itemSpacing = 24;
        set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24;
        set.primaryAxisSizingMode = "AUTO";
        set.counterAxisSizingMode = "AUTO";
        set.counterAxisAlignItems = "CENTER";
        set.x = x0; set.y = titre.y + Math.ceil(titre.height) + 32;
        set.setPluginData(MARQUE_REL, "1");
        compCree = true;
      }
      for (let i = 0; i < set.children.length; i++) {
        const m = /État=(.+)$/.exec(set.children[i].name);
        if (m) VARIANTES[m[1]] = set.children[i];
      }
    }

    // Instance du composant si on l'a, sinon la même frame dessinée par la
    // lib : un composant manquant ne doit pas trouer l'écran.
    function relation(etat) {
      const v = VARIANTES[etat];
      if (v) {
        try {
          const inst = v.createInstance();
          inst.name = "Button/Relation/" + etat;
          return inst;
        } catch (e) {}
      }
      return boutonRelation(etat);
    }

    // ---------- briques propres aux abonnés ----------

    // Rangée de personne avec un bouton de relation à droite. Texte plus
    // étroit que rangeeAmi (180 px) : le bouton compact prend ~140 px.
    function rangeeRelation(nom, meta, i, etat) {
      const r = frame("Card/Friend/" + nom, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      g.appendChild(avatar(nom, i, 40));
      const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
      t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(para(meta, 112, { size: 12, color: C.sub, lineHeight: 16 }));
      g.appendChild(t);
      r.appendChild(g);
      r.appendChild(relation(etat));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    function carteTexte(titre, corps) {
      const c = card("Card/Section/" + titre, { gap: S.sm });
      c.appendChild(text(titre, { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(corps, W - GUT * 2 - S.lg * 2, { size: 16, color: C.ink, lineHeight: 22 }));
      return c;
    }

    // Un profil de personne. `p` décrit l'état : compteurs, pastilles de
    // relation, retour d'action éventuel, puis la barre d'actions.
    function profil(screen, p) {
      const col = preparer(screen, 40, 0);
      const bande = enteteProfil(col, p.nom, p.i, p.meta, p.sous, [
        compteursProfil(p.compteurs),
        pastillesRelation(p.relation)
      ]);
      overlay(bande, boutonRetour("<"), GUT, S.xl);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      if (p.toast) addFill(blocs, p.toast);
      addFill(blocs, carteTexte("Présentation", p.bio));
      if (p.carte) addFill(blocs, p.carte);
      addFill(blocs, bandeauPrive(p.prive));
      addFill(col, blocs);

      barreActions(col, p.principale, p.secondaires, p.destructive, p.note);
      finaliser(screen, col);
    }

    const INES = {
      nom: "Inès", i: 1,
      sous: "2 amis en commun : Thomas et Léa",
      bio: "Je range tout en cartons étiquetés et je chine le week-end. Couture, déco, vinyles."
    };
    const PAUL = {
      nom: "Paul", i: 2,
      sous: "1 ami en commun : Karim",
      bio: "Bricoleur du dimanche. Mon garage est enfin rangé, étagère par étagère."
    };
    function avec(base, ajout) {
      const o = {};
      for (const k in base) o[k] = base[k];
      for (const k in ajout) o[k] = ajout[k];
      return o;
    }

    // ============ RANGÉE 1 — PROFILS ============

    // 1. Je ne suis pas abonné
    ecranNouveau(SECTION, "Abonnés — Profil · Non abonné", 0, function (screen) {
      profil(screen, avec(INES, {
        meta: "Inscrite depuis janvier 2026",
        compteurs: [[38, "abonnés"], [21, "abonnements"], [9, "amis"]],
        relation: [["Vous ne vous suivez pas", "neutre"]],
        prive: "S'abonner ne donne accès à rien de privé : Inès choisit elle-même ce qu'elle partage avec ses abonnés.",
        principale: bouton("S'abonner", "primary"),
        secondaires: [bouton("Demander en ami", "secondary")],
        note: "Inès sera prévenue. S'abonner ne fait pas de vous des amis."
      }));
    }, 0);

    // 2. Abonnement confirmé (retour d'action)
    ecranNouveau(SECTION, "Abonnés — Abonnement confirmé", 1, function (screen) {
      profil(screen, avec(INES, {
        meta: "Tu la suis depuis aujourd'hui",
        compteurs: [[39, "abonnés"], [21, "abonnements"], [9, "amis"]],
        relation: [["Tu la suis", "arendre"]],
        toast: toastSucces("Abonnement confirmé !", "Inès est prévenue par une notification."),
        prive: "Tu verras ce qu'Inès partage avec ses abonnés, en lecture seule. Rien d'autre.",
        principale: bouton("Abonné", "secondary"),
        secondaires: [bouton("Demander en ami", "secondary")],
        note: "Touche « Abonné » pour te désabonner."
      }));
    }, 0);

    // 3. Je suis abonné
    ecranNouveau(SECTION, "Abonnés — Profil · Abonné", 2, function (screen) {
      profil(screen, avec(INES, {
        meta: "Tu la suis depuis le 2 sept. 2026",
        compteurs: [[39, "abonnés"], [21, "abonnements"], [9, "amis"]],
        relation: [["Tu la suis", "arendre"]],
        carte: carteSection("Partagé avec ses abonnés", [
          ligneInfo("Éléments visibles", "Aucun pour l'instant")
        ]),
        prive: "Tu verras ce qu'Inès partage avec ses abonnés, en lecture seule. Rien d'autre.",
        principale: bouton("Abonné", "secondary"),
        secondaires: [bouton("Demander en ami", "secondary")],
        note: "Touche « Abonné » pour te désabonner."
      }));
    }, 0);

    // 4. Confirmation légère de désabonnement (overlay)
    ecranNouveau(SECTION, "Abonnés — Confirmation · Se désabonner", 3, function (screen) {
      modale(screen,
        "Se désabonner d'Inès ?",
        "Tu ne verras plus ce qu'Inès partage avec ses abonnés.",
        "Se désabonner",
        "Si vous vous suiviez mutuellement, la suggestion « Devenir amis » disparaît. Une amitié existante n'est jamais retirée par un désabonnement.",
        "primary");
    }, 0);

    // 5. Cette personne est abonnée à moi
    ecranNouveau(SECTION, "Abonnés — Profil · Abonné à toi", 4, function (screen) {
      profil(screen, avec(PAUL, {
        meta: "Te suit depuis le 10 sept. 2026",
        compteurs: [[14, "abonnés"], [30, "abonnements"], [6, "amis"]],
        relation: [["Abonné à toi", "neutre"]],
        prive: "Paul te suit, mais il ne voit que ce que tu as choisi de partager avec tes abonnés.",
        principale: bouton("S'abonner en retour", "primary"),
        secondaires: [bouton("Demander en ami", "secondary")],
        note: "Si tu t'abonnes en retour, Penderie te proposera de devenir amis."
      }));
    }, 0);

    // 6. Abonnement mutuel détecté -> proposition
    ecranNouveau(SECTION, "Abonnés — Mutuel · Proposition ami", 5, function (screen) {
      profil(screen, avec(PAUL, {
        meta: "Vous vous suivez depuis aujourd'hui",
        compteurs: [[15, "abonnés"], [30, "abonnements"], [6, "amis"]],
        relation: [["Vous vous suivez", "arendre"]],
        toast: toastInfo("Vous vous suivez mutuellement", "Tu es maintenant abonné à Paul.", C.primary),
        carte: carteTexte("Vous pourriez devenir amis",
          "Entre amis, vous pourrez vous prêter des objets et vous partager des éléments. Rien n'est partagé sans ton accord."),
        prive: "Vous vous suivez, mais vous n'êtes pas amis : aucun accès privé en plus.",
        principale: bouton("Devenir amis", "primary"),
        secondaires: [bouton("Plus tard", "secondary")],
        note: "L'amitié n'est jamais automatique : Paul devra accepter ta demande."
      }));
    }, 0);

    // 7. Demande d'ami envoyée depuis la proposition
    ecranNouveau(SECTION, "Abonnés — Mutuel · Demande envoyée", 6, function (screen) {
      profil(screen, avec(PAUL, {
        meta: "Vous vous suivez depuis aujourd'hui",
        compteurs: [[15, "abonnés"], [30, "abonnements"], [6, "amis"]],
        relation: [["Vous vous suivez", "arendre"], ["Demande envoyée", "termine"]],
        toast: toastSucces("Demande d'ami envoyée !", "Paul la verra à sa prochaine connexion."),
        prive: "Tant que Paul n'a pas accepté, vous restez abonnés, pas amis : il ne voit rien de plus.",
        principale: bouton("Demande envoyée", "disabled"),
        secondaires: null,
        destructive: "Annuler la demande",
        note: null
      }));
    }, 0);

    // ============ RANGÉE 2 — LISTES ============

    function liste(screen, titre, meta, actif, recherche, entete, rangees, prive) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage(titre, meta));
      addFill(col, ongletsN(ONGLETS_RELATIONS, actif));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche(recherche));
      addFill(col, rech);

      const sec = frame("Section/" + titre, { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection(entete, null));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < rangees.length; i++) addFill(l, rangees[i]);
      addFill(sec, l);
      addFill(col, sec);

      const b = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(b, bandeauPrive(prive));
      addFill(col, b);

      finaliser(screen, col);
      poserNav(screen, null);
    }

    // 8. Mes abonnés
    ecranNouveau(SECTION, "Abonnés — Mes abonnés", 0, function (screen) {
      liste(screen, "Mes abonnés", "5 personnes te suivent", 1,
        "Rechercher un abonné...", "5 abonnés", [
          rangeeRelation("Paul", "Abonné à toi", 2, "S'abonner en retour"),
          rangeeRelation("Thomas", "Vous êtes amis", 0, "Ami"),
          rangeeRelation("Sarah", "Abonnée à toi", 2, "S'abonner en retour"),
          rangeeRelation("Chloé", "Vous vous suivez", 1, "Devenir amis"),
          rangeeRelation("Karim", "Vous êtes amis", 2, "Ami")
        ],
        "Te suivre ne donne accès à rien : tu choisis ce que tu partages avec tes abonnés, en lecture seule.");
    }, 1);

    // 9. Mes abonnés — état vide
    ecranNouveau(SECTION, "Abonnés — Mes abonnés · État vide", 1, function (screen) {
      etatVidePersonnes(screen, "Mes abonnés", "0 abonné",
        "Aucun abonné",
        "Quand quelqu'un s'abonnera à ton profil, il apparaîtra ici. Te suivre ne lui donne accès à rien de privé.",
        "Voir mes amis");
    }, 1);

    // 10. Mes abonnements
    ecranNouveau(SECTION, "Abonnés — Mes abonnements", 2, function (screen) {
      liste(screen, "Mes abonnements", "Tu suis 4 personnes", 2,
        "Rechercher un abonnement...", "4 abonnements", [
          rangeeRelation("Thomas", "Vous êtes amis", 0, "Abonné"),
          rangeeRelation("Inès", "Tu la suis", 1, "Abonné"),
          rangeeRelation("Chloé", "Vous vous suivez", 1, "Devenir amis"),
          rangeeRelation("Karim", "Vous êtes amis", 2, "Abonné")
        ],
        "Tu ne vois que ce que ces personnes partagent avec leurs abonnés. Leur dressing reste privé.");
    }, 1);

    // 11. Mes abonnements — état vide
    ecranNouveau(SECTION, "Abonnés — Mes abonnements · État vide", 3, function (screen) {
      etatVidePersonnes(screen, "Mes abonnements", "0 abonnement",
        "Aucun abonnement",
        "Abonne-toi au profil d'un proche pour voir ce qu'il choisit de partager avec ses abonnés.",
        "Voir mes amis");
    }, 1);

    if (compCree) REUSSIS.push("Composant « Button / Relation » créé sur Components");
    rapport("Lot 20 Abonnés");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
