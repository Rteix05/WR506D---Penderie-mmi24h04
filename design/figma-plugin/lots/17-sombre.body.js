// ============================================================
// Lot 17 — MODE SOMBRE (écran d'accueil)
//
// Ne redessine rien : clone « Accueil — Tableau de bord », pose la copie
// à droite de l'original et la repeint jeton par jeton. L'original n'est
// pas touché.
//
// Le point clé : la maquette n'aplatit jamais ses teintes (une pastille
// est un aplat de marque à 10 % d'opacité, pas une couleur calculée).
// Remplacer la couleur de base suffit donc à recalculer toute la teinte.
//
// Deux tables de correspondance, et pas une seule, parce qu'une même
// couleur ne veut pas dire la même chose selon qu'elle peint un texte ou
// une surface : `white` en texte reste blanc (sur un bouton plein), en
// surface il devient la couleur de carte.
//
// Palette sombre vérifiée : 23 couples texte/fond, tous >= 4.5:1
// (voir PENDERIE_RGAA.md pour la méthode de calcul).
// ============================================================

(async function () {
  try {
    figma.notify("Lot 17 Mode sombre : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");

    const SUFFIXE = " · Sombre";
    const NOM_SOURCE = "Accueil — Tableau de bord";

    // ---------- palette sombre ----------
    const D = {
      bg:      { r: 0.070588, g: 0.082353, b: 0.101961 },  // #12151A
      surface: { r: 0.105882, g: 0.121569, b: 0.149020 },  // #1B1F26
      ink:     { r: 0.929412, g: 0.945098, b: 0.964706 },  // #EDF1F6
      sub:     { r: 0.607843, g: 0.654902, b: 0.721569 },  // #9BA7B8
      primary: { r: 1.000000, g: 0.376471, b: 0.596078 },  // #FF6098
      main:    { r: 0.262745, g: 0.733333, b: 0.662745 },  // #43BBA9
      error:   { r: 1.000000, g: 0.419608, b: 0.419608 },  // #FF6B6B
      cloth:   { r: 0.807843, g: 0.525490, b: 0.870588 }   // #CE86DE
    };

    // Texte : les couleurs de contenu s'éclaircissent, le blanc posé sur
    // un aplat de marque reste blanc.
    const MAP_TEXTE = [
      [C.ink, D.ink], [C.sub, D.sub],
      [C.primary, D.primary], [C.primaryTexte, D.primary],
      [C.main, D.main], [C.mainTexte, D.main],
      [C.error, D.error], [C.errorTexte, D.error],
      [C.cloth, D.cloth]
    ];

    // Surfaces : le blanc devient la carte, le fond devient le fond, les
    // teintes d'encre s'inversent en teintes de lumière. Les aplats de
    // marque ne bougent pas : ils portent déjà du texte blanc lisible.
    const MAP_FOND = [
      [C.white, D.surface], [C.bg, D.bg],
      [C.ink, D.ink], [C.sub, D.sub]
    ];

    function memeCouleur(a, b) {
      return Math.abs(a.r - b.r) < 0.004
          && Math.abs(a.g - b.g) < 0.004
          && Math.abs(a.b - b.b) < 0.004;
    }
    function traduire(couleur, table) {
      for (let i = 0; i < table.length; i++) {
        if (memeCouleur(couleur, table[i][0])) return table[i][1];
      }
      return null;
    }
    function repeindre(paints, table) {
      if (!Array.isArray(paints) || !paints.length) return null;
      let touche = false;
      const neufs = paints.map(function (p) {
        if (p.type !== "SOLID" || !p.color) return p;
        const c = traduire(p.color, table);
        if (!c) return p;
        touche = true;
        const q = JSON.parse(JSON.stringify(p));
        q.color = c;
        return q;
      });
      return touche ? neufs : null;
    }

    // En mode sombre une ombre portée ne se voit plus : on la renforce
    // nettement, sinon les cartes flottent sans limite visible.
    function repeindreOmbres(effets) {
      if (!Array.isArray(effets) || !effets.length) return null;
      let touche = false;
      const neufs = effets.map(function (e) {
        if (e.type !== "DROP_SHADOW") return e;
        touche = true;
        const f = JSON.parse(JSON.stringify(e));
        f.color = { r: 0, g: 0, b: 0, a: Math.min(0.55, (e.color.a || 0.1) * 4) };
        return f;
      });
      return touche ? neufs : null;
    }

    let repeints = 0, ignores = 0;

    function parcourir(n) {
      // On n'entre pas dans les instances : leur blanc n'est pas une
      // surface mais un pictogramme (le + du bouton flottant), et le
      // repeindre le ferait disparaître.
      if (n.type === "INSTANCE") { ignores++; return; }

      const table = n.type === "TEXT" ? MAP_TEXTE : MAP_FOND;
      try {
        const f = repeindre(n.fills, table);
        if (f) { n.fills = f; repeints++; }
      } catch (e) {}
      try {
        const s = repeindre(n.strokes, MAP_FOND);
        if (s) n.strokes = s;
      } catch (e) {}
      try {
        const o = repeindreOmbres(n.effects);
        if (o) n.effects = o;
      } catch (e) {}

      const kids = n.children || [];
      for (let i = 0; i < kids.length; i++) parcourir(kids[i]);
    }

    // Le clone hérite des interactions de l'original, qui pointent vers
    // des écrans clairs. On les retire : cette copie est une
    // démonstration de thème, pas une étape de parcours.
    async function retirerReactions(n) {
      if (n.reactions && n.reactions.length) {
        try {
          if (n.setReactionsAsync) await n.setReactionsAsync([]);
          else n.reactions = [];
        } catch (e) {}
      }
      const kids = n.children || [];
      for (let i = 0; i < kids.length; i++) await retirerReactions(kids[i]);
    }

    // ---------- exécution ----------
    const source = trouver(NOM_SOURCE);
    if (!source) throw new Error("écran « " + NOM_SOURCE + " » introuvable");

    // Relançable : on supprime la version sombre précédente s'il y en a une.
    const ancienne = trouver(NOM_SOURCE + SUFFIXE);
    if (ancienne) { try { ancienne.remove(); } catch (e) {} }

    const copie = source.clone();
    copie.name = NOM_SOURCE + SUFFIXE;
    if (source.parent) source.parent.appendChild(copie);
    copie.x = source.x + source.width + 60;
    copie.y = source.y;

    parcourir(copie);
    await retirerReactions(copie);

    const resume = repeints + " calques repeints · " + ignores
      + " instance(s) laissee(s) telles quelles";
    console.log("Mode sombre : " + resume);
    figma.notify("Mode sombre : " + resume, { timeout: 8000 });
    figma.viewport.scrollAndZoomIntoView([copie]);

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
