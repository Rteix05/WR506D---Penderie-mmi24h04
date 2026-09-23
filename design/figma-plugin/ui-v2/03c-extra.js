// ───────── Blocs spécifiques : logo, en-tête d'accueil, compteur, feuille d'ajout ─────────
// Logo existant du fichier (composant « Logo » / « Logo 2 ») — l'identité n'est pas redessinée
const LOGO = figma.root.findOne(n => n.type === "COMPONENT" && (n.name === "Logo 2" || n.name === "Logo"));

function renderExtra(parent, b, spec) {
  if (b.logo) {
    const w = hstack("Logo", 0); add(parent, w, { fillW: true }); w.primaryAxisAlignItems = "CENTER";
    if (LOGO) { const l = LOGO.createInstance(); const k = 72 / Math.max(l.width, l.height); l.rescale(k); w.appendChild(l); }
    return true;
  }
  if (b.homeHeader) {
    // Salutation + accès discrets : notifications, partages, profil
    const row = hstack("En-tête", SP.m, { justify: "SPACE_BETWEEN" }); add(parent, row, { fillW: true }); row.primaryAxisAlignItems = "SPACE_BETWEEN";
    const left = hstack("Identité", SP.m);
    const av = inst("Avatar", { Taille: "M" }); hotspot(av, "Mathis Chhour"); left.appendChild(av);
    const tx = vstack("Textes", 2); tx.appendChild(text(b.homeHeader.greet, "brand", "ink")); tx.appendChild(text(b.homeHeader.sub, "caption", "muted"));
    left.appendChild(tx); row.appendChild(left);
    const right = hstack("Raccourcis", SP.s);
    const round = (ic, key, alias) => { const f = frame(key, { dir: "h", w: 40, h: 40, justify: "CENTER", align: "CENTER", fill: fill("white"), r: R.pill, shadow: SHADOW_SOFT }); f.appendChild(icon(ic, 20, "ink")); hotspot(f, key, alias); return f; };
    right.appendChild(round("share", "Mes partages", ["communication / share_android"]));
    const bell = round("bell", "Notifications", ["communication / bell_notification"]);
    const dot = ellipse("Non lu", 8, fill("primary")); bell.appendChild(dot); dot.layoutPositioning = "ABSOLUTE"; dot.x = 26; dot.y = 8;
    right.appendChild(bell); row.appendChild(right);
    return true;
  }
  if (b.stepper) {
    const row = hstack("Compteur", SP.xl, { p: [16, 20], fill: fill("white"), r: R.l }); add(parent, row, { fillW: true }); row.primaryAxisAlignItems = "CENTER";
    const btn = ic => { const f = frame(ic, { dir: "h", w: 48, h: 48, justify: "CENTER", align: "CENTER", fill: fill("primary", 0.1), r: R.pill }); f.appendChild(icon(ic, 22, "primary")); return f; };
    const minus = btn("close"); // « − » : icône fermer tournée remplacée par un trait simple
    minus.children[0].remove(); minus.appendChild(rect("Moins", 16, 2, fill("primary"), 1));
    const val = vstack("Valeur", 0, { align: "CENTER" }); val.appendChild(text(b.stepper.value, "display", "ink", { align: "CENTER" })); val.appendChild(text(b.stepper.label, "caption", "muted", { align: "CENTER" }));
    row.appendChild(minus); row.appendChild(val); row.appendChild(btn("plus"));
    return true;
  }
  return false;
}

// Feuille « Ajouter » posée par-dessus l'accueil (écran « Menu d'ajout »)
function addSheet(fr, s) {
  const dim = rect("Voile", W, H, fill("ink", 0.45)); fr.appendChild(dim); hotspot(dim, "Voile", ["voile"]);
  const sh = frame("Feuille", { dir: "v", gap: SP.l, p: [12, GUTTER, 34, GUTTER], w: W, fill: fill("white"), r: R.xl });
  sh.counterAxisSizingMode = "FIXED"; sh.bottomLeftRadius = 0; sh.bottomRightRadius = 0;
  const grip = hstack("Poignée", 0); grip.primaryAxisAlignItems = "CENTER"; grip.appendChild(rect("Barre", 40, 4, fill("ink", 0.15), 2)); add(sh, grip, { fillW: true });
  const head = hstack("Titre", 0, { justify: "SPACE_BETWEEN" }); head.primaryAxisAlignItems = "SPACE_BETWEEN"; add(sh, head, { fillW: true });
  head.appendChild(text(s.title, "title", "ink"));
  const x = frame("Fermer", { dir: "h", w: 36, h: 36, justify: "CENTER", align: "CENTER", fill: fill("ink", 0.06), r: R.pill }); x.appendChild(icon("close", 18, "ink")); head.appendChild(x); hotspot(x, "fab", ["add activity"]);
  const list = vstack("Options", SP.s); add(sh, list, { fillW: true });
  renderBlock(list, { list: s.options.map(o => ({ ...o, alias: [`bulle ${o.ic === "hanger" ? "vêtement" : o.ic === "box" ? "objet" : o.ic === "house" ? "logement" : "scanner"}`] })) }, {});
  fr.appendChild(sh); sh.x = 0; sh.y = H - sh.height;
}
