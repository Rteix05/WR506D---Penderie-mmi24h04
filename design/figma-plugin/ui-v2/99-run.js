// ═════════ Exécution ═════════
const NAV_DEST = ["14:1277", "87:8216", "106:9507", "101:9066", "111:13364"]; // Accueil · Inventaire · Dressing · Logements · Compte
const PUSH = { type: "PUSH", direction: "LEFT", matchLayers: false, easing: { type: "EASE_OUT" }, duration: 0.3 };
const nav = (dest, tr) => [{ trigger: { type: "ON_CLICK" }, actions: [{ type: "NODE", destinationId: dest, navigation: "NAVIGATE", transition: tr, preserveScrollPosition: false }] }];
const hasReactions = n => n.reactions && n.reactions.length > 0;
report.linked = 0;

if (!SKIP_SCREENS) {
  for (const s of SPECS) {
    if (ONLY && !ONLY.includes(s.group)) continue;
    const fr = await figma.getNodeByIdAsync(s.id);
    if (!fr || fr.type !== "FRAME") { warn(`Écran introuvable : ${s.id}`); continue; }
    if (DRY_RUN) { report.screens.push(`[plan] ${fr.name}`); continue; }
    const snaps = snapshot(fr);
    try {
      screen(fr, s);
      if (s.sheet) { addSheet(fr, s.sheet); fr.numberOfFixedChildren = fr.numberOfFixedChildren + 2; }
    } catch (e) { warn(`${fr.name} : ${e.message}`); continue; }
    await restore(fr, snaps);

    // Conventions communes, seulement là où rien n'a été rebranché : retour, onglets, liens des nouveaux éléments
    const backBtn = fr.findOne(n => n.name === "Bouton retour");
    if (backBtn && !hasReactions(backBtn)) { if (await setReactions(backBtn, [{ trigger: { type: "ON_CLICK" }, actions: [{ type: "BACK" }] }])) report.linked++; }
    const tb = fr.findOne(n => n.name === "Tab bar");
    if (tb) for (let i = 0; i < 5; i++) {
      const item = tb.findOne(n => n.name.startsWith(`Onglet ${i + 1} `));
      if (item && !hasReactions(item) && NAV_DEST[i] !== s.id && await setReactions(item, nav(NAV_DEST[i], null))) report.linked++;
    }
    for (const [label, dest] of Object.entries(LINK[s.id] || {})) {
      const n = findHotspot(fr, norm(label));
      if (n && !hasReactions(n) && await figma.getNodeByIdAsync(dest) && await setReactions(n, nav(dest, PUSH))) report.linked++;
    }
    report.screens.push(fr.name);
  }
}

print(`${DRY_RUN ? "[SIMULATION] " : ""}Design system : ${report.ds.length ? "\n  " + report.ds.join("\n  ") : "déjà en place"}`);
print(`Écrans refaits : ${report.screens.length}`);
print(`Interactions rebranchées : ${report.restored} · liens de convention ajoutés : ${report.linked}`);
print(`Interactions à vérifier : ${report.lost.length ? "\n  " + report.lost.join("\n  ") : "aucune"}`);
print(`Avertissements : ${report.warn.length ? "\n  " + report.warn.join("\n  ") : "aucun"}`);
figma.notify(`UI v2 : ${report.screens.length} écrans · ${report.restored} interactions rebranchées${report.lost.length ? ` · ${report.lost.length} à vérifier` : ""}`);
