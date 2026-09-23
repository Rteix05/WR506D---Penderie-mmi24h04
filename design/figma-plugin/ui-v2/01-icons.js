// ───────── Icônes : set de variantes « Icon » (trait 1,75 px, grille 24) ─────────
// Tracés simples (M/L/C/Z) : l'éditeur de vecteurs Figma les accepte tels quels.
const ICON_PATHS = {
  home: "M3 10.5 L12 3 L21 10.5 L21 20 C21 20.55 20.55 21 20 21 L15 21 L15 14 L9 14 L9 21 L4 21 C3.45 21 3 20.55 3 20 Z",
  box: "M3 7 L12 3 L21 7 L21 17 L12 21 L3 17 Z M3 7 L12 11 L21 7 M12 11 L12 21",
  hanger: "M9.8 5.2 C9.8 3.9 10.8 3 12 3 C13.2 3 14.2 3.9 14.2 5.1 C14.2 6.3 12 6.8 12 8 L12 8.5 L21 15.2 C21.7 15.8 21.3 17 20.3 17 L3.7 17 C2.7 17 2.3 15.8 3 15.2 L12 8.5",
  house: "M4 21 L4 9 L12 3 L20 9 L20 21 Z M9.5 21 L9.5 15 L14.5 15 L14.5 21",
  user: "M12 12 C14.2 12 16 10.2 16 8 C16 5.8 14.2 4 12 4 C9.8 4 8 5.8 8 8 C8 10.2 9.8 12 12 12 Z M4 21 C4 17.1 7.6 15 12 15 C16.4 15 20 17.1 20 21",
  users: "M9 11 C10.66 11 12 9.66 12 8 C12 6.34 10.66 5 9 5 C7.34 5 6 6.34 6 8 C6 9.66 7.34 11 9 11 Z M3 19.5 C3 16.4 5.7 14.5 9 14.5 C12.3 14.5 15 16.4 15 19.5 M16 5.3 C17.5 5.6 18.5 6.7 18.5 8 C18.5 9.3 17.5 10.4 16 10.7 M17.8 14.8 C19.8 15.3 21 16.9 21 19.5",
  search: "M11 18 C14.87 18 18 14.87 18 11 C18 7.13 14.87 4 11 4 C7.13 4 4 7.13 4 11 C4 14.87 7.13 18 11 18 Z M16 16 L20.5 20.5",
  scan: "M4 8.5 L4 5.5 C4 4.67 4.67 4 5.5 4 L8.5 4 M15.5 4 L18.5 4 C19.33 4 20 4.67 20 5.5 L20 8.5 M20 15.5 L20 18.5 C20 19.33 19.33 20 18.5 20 L15.5 20 M8.5 20 L5.5 20 C4.67 20 4 19.33 4 18.5 L4 15.5 M7 12 L17 12",
  plus: "M12 5 L12 19 M5 12 L19 12",
  chevron: "M9.5 6 L15.5 12 L9.5 18",
  back: "M15 5 L8 12 L15 19",
  close: "M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5",
  bell: "M6 16.5 L6 11 C6 7.7 8.7 5 12 5 C15.3 5 18 7.7 18 11 L18 16.5 L19.5 18 L4.5 18 Z M10 21 L14 21",
  share: "M12 3.5 L12 15 M7.5 8 L12 3.5 L16.5 8 M5 13 L5 19.5 C5 20.05 5.45 20.5 6 20.5 L18 20.5 C18.55 20.5 19 20.05 19 19.5 L19 13",
  heart: "M12 20 C12 20 3 14.5 3 8.6 C3 6.1 5 4 7.5 4 C9.4 4 11 5.2 12 6.8 C13 5.2 14.6 4 16.5 4 C19 4 21 6.1 21 8.6 C21 14.5 12 20 12 20 Z",
  filter: "M4 6.5 L20 6.5 M7 12 L17 12 M10 17.5 L14 17.5",
  sliders: "M4 7 L13 7 M17 7 L20 7 M15 5 L15 9 M4 17 L7 17 M11 17 L20 17 M9 15 L9 19",
  lock: "M6 11 L18 11 L18 20.5 L6 20.5 Z M8.5 11 L8.5 8 C8.5 6.07 10.07 4.5 12 4.5 C13.93 4.5 15.5 6.07 15.5 8 L15.5 11",
  pin: "M12 21 C12 21 5 14.6 5 9.6 C5 5.9 8.1 3 12 3 C15.9 3 19 5.9 19 9.6 C19 14.6 12 21 12 21 Z M12 12 C13.38 12 14.5 10.88 14.5 9.5 C14.5 8.12 13.38 7 12 7 C10.62 7 9.5 8.12 9.5 9.5 C9.5 10.88 10.62 12 12 12 Z",
  check: "M5 12.5 L10 17.5 L19 7",
  alert: "M12 9 L12 13.5 M12 16.8 L12 17 M10.3 4.2 L2.9 17.3 C2.1 18.7 3.1 20.5 4.7 20.5 L19.3 20.5 C20.9 20.5 21.9 18.7 21.1 17.3 L13.7 4.2 C12.9 2.8 11.1 2.8 10.3 4.2 Z",
  camera: "M4 8.5 C4 7.67 4.67 7 5.5 7 L8 7 L9.5 5 L14.5 5 L16 7 L18.5 7 C19.33 7 20 7.67 20 8.5 L20 17.5 C20 18.33 19.33 19 18.5 19 L5.5 19 C4.67 19 4 18.33 4 17.5 Z M12 16 C13.66 16 15 14.66 15 13 C15 11.34 13.66 10 12 10 C10.34 10 9 11.34 9 13 C9 14.66 10.34 16 12 16 Z",
  image: "M4 5 L20 5 L20 19 L4 19 Z M4 15.5 L9 11 L13 15 L15.5 12.5 L20 17 M15.5 9.5 L15.6 9.5",
  tag: "M3.5 11.5 L3.5 4.5 C3.5 3.95 3.95 3.5 4.5 3.5 L11.5 3.5 L20.5 12.5 L12.5 20.5 Z M8 8 L8.1 8",
  sparkle: "M12 3 L13.9 10.1 L21 12 L13.9 13.9 L12 21 L10.1 13.9 L3 12 L10.1 10.1 Z",
  truck: "M3 6 L14 6 L14 16 L3 16 Z M14 9.5 L18 9.5 L21 12.5 L21 16 L14 16 M6.5 19 L6.6 19 M17.5 19 L17.6 19",
  swap: "M4 8.5 L19 8.5 M15.5 5 L19 8.5 L15.5 12 M20 15.5 L5 15.5 M8.5 12 L5 15.5 L8.5 19",
  trash: "M4 7 L20 7 M9 7 L9 4.5 L15 4.5 L15 7 M6.2 7 L7.1 19.6 C7.15 20.1 7.55 20.5 8.1 20.5 L15.9 20.5 C16.45 20.5 16.85 20.1 16.9 19.6 L17.8 7",
  edit: "M4.5 19.5 L4.5 15.8 L15.3 5 C15.9 4.4 16.9 4.4 17.5 5 L19 6.5 C19.6 7.1 19.6 8.1 19 8.7 L8.2 19.5 Z M13.5 7 L17 10.5",
  calendar: "M4 6 L20 6 L20 20 L4 20 Z M4 10.5 L20 10.5 M8 3.5 L8 7.5 M16 3.5 L16 7.5",
  eye: "M2.5 12 C4.8 7.4 8.2 5 12 5 C15.8 5 19.2 7.4 21.5 12 C19.2 16.6 15.8 19 12 19 C8.2 19 4.8 16.6 2.5 12 Z M12 15 C13.66 15 15 13.66 15 12 C15 10.34 13.66 9 12 9 C10.34 9 9 10.34 9 12 C9 13.66 10.34 15 12 15 Z",
  message: "M4 5.5 C4 4.95 4.45 4.5 5 4.5 L19 4.5 C19.55 4.5 20 4.95 20 5.5 L20 15.5 C20 16.05 19.55 16.5 19 16.5 L9 16.5 L5 20 L5 16.5 C4.45 16.5 4 16.05 4 15.5 Z",
  card: "M3 6.5 L21 6.5 L21 18 L3 18 Z M3 10.5 L21 10.5 M7 14.5 L10 14.5",
  link: "M10 14 L14 10 M8.5 11.5 L6.5 13.5 C5.1 14.9 5.1 17.1 6.5 18.5 C7.9 19.9 10.1 19.9 11.5 18.5 L13.5 16.5 M15.5 12.5 L17.5 10.5 C18.9 9.1 18.9 6.9 17.5 5.5 C16.1 4.1 13.9 4.1 12.5 5.5 L10.5 7.5",
  qr: "M4 4 L10 4 L10 10 L4 10 Z M14 4 L20 4 L20 10 L14 10 Z M4 14 L10 14 L10 20 L4 20 Z M14 14 L16 14 M18.5 14 L20 14 L20 16 M14 18 L14 20 L16 20 M18.5 18.5 L20 20",
  clock: "M12 20.5 C16.69 20.5 20.5 16.69 20.5 12 C20.5 7.31 16.69 3.5 12 3.5 C7.31 3.5 3.5 7.31 3.5 12 C3.5 16.69 7.31 20.5 12 20.5 Z M12 7.5 L12 12 L15 14",
  shield: "M12 3.5 L19.5 6.5 L19.5 11.5 C19.5 16 16.3 19.3 12 20.5 C7.7 19.3 4.5 16 4.5 11.5 L4.5 6.5 Z M9 12 L11 14 L15 10",
  settings: "M4 7 L13 7 M17 7 L20 7 M15 5 L15 9 M4 17 L7 17 M11 17 L20 17 M9 15 L9 19",
  logout: "M14 4.5 L18.5 4.5 C19.05 4.5 19.5 4.95 19.5 5.5 L19.5 18.5 C19.5 19.05 19.05 19.5 18.5 19.5 L14 19.5 M10 8 L6 12 L10 16 M6 12 L16 12",
  drill: "M4 7 L15 7 L15 12 L4 12 Z M15 8.5 L20 8.5 M10 12 L9 19.5 L12.5 19.5 L13 12",
  lamp: "M8 4 L16 4 L18.5 11 L5.5 11 Z M12 11 L12 18 M8.5 20 L15.5 20",
  ball: "M12 20.5 C16.69 20.5 20.5 16.69 20.5 12 C20.5 7.31 16.69 3.5 12 3.5 C7.31 3.5 3.5 7.31 3.5 12 C3.5 16.69 7.31 20.5 12 20.5 Z M3.5 12 L20.5 12 M12 3.5 C9.5 6 9.5 18 12 20.5 M12 3.5 C14.5 6 14.5 18 12 20.5",
  headphones: "M4 16 L4 12 C4 7.58 7.58 4 12 4 C16.42 4 20 7.58 20 12 L20 16 M4 14 L7 14 L7 20 L4 20 Z M17 14 L20 14 L20 20 L17 20 Z",
  tshirt: "M8.5 4 L4 6.5 L5.5 10.5 L7.5 9.5 L7.5 20 L16.5 20 L16.5 9.5 L18.5 10.5 L20 6.5 L15.5 4 C15 5.5 13.7 6.5 12 6.5 C10.3 6.5 9 5.5 8.5 4 Z",
  jacket: "M8.5 4 L4 7 L4 20 L10 20 L10 11 L12 8 L14 11 L14 20 L20 20 L20 7 L15.5 4 L12 8 Z",
  pants: "M7 4 L17 4 L18.5 20 L14 20 L12 10 L10 20 L5.5 20 Z",
  shoe: "M3 17 L3 9 L8 9 L10.5 12 L17 13.5 C19.5 14 21 15.3 21 17 Z M3 17 L21 17 L21 19 L3 19 Z",
  cap: "M4 14 C4 9.58 7.58 6 12 6 C16.42 6 20 9.58 20 14 Z M4 14 L22 14 C22 15.1 21.1 16 20 16 L4 16 Z",
};

const cmpPage = figma.root.children.find(p => /^components?$/i.test(p.name.trim()))
  || figma.root.children.find(p => /component/i.test(p.name));
if (!cmpPage) throw new Error("Page « Components » introuvable");

// Déplace un tracé pour que son coin haut-gauche soit en (0,0) ; renvoie aussi le décalage
function normalizePath(d) {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g);
  const nums = tokens.filter(x => !/[MLCZ]/.test(x)).map(Number);
  let minX = Infinity, minY = Infinity;
  for (let i = 0; i < nums.length; i += 2) { minX = Math.min(minX, nums[i]); minY = Math.min(minY, nums[i + 1]); }
  let k = 0;
  const out = tokens.map(x => /[MLCZ]/.test(x) ? x : String(+(Number(x) - (k++ % 2 === 0 ? minX : minY)).toFixed(3)));
  return { data: out.join(" "), x: minX, y: minY };
}

function findSet(name) { return cmpPage.findOne(n => n.type === "COMPONENT_SET" && n.name === name); }

let ICON_SET = findSet("Icon");
const ICON = {};
{
  const have = new Set(ICON_SET ? ICON_SET.children.map(c => c.name.replace(/^Name=/, "")) : []);
  const fresh = [];
  if (!DRY_RUN) {
    for (const [name, d] of Object.entries(ICON_PATHS)) {
      if (have.has(name)) continue;
      const c = figma.createComponent();
      c.name = `Name=${name}`; c.resize(24, 24); c.fills = [];
      const v = figma.createVector(), p = normalizePath(d);
      v.vectorPaths = [{ windingRule: "NONE", data: p.data }];
      v.name = "Glyph"; v.fills = []; v.strokes = fill("ink");
      v.strokeWeight = 1.75; v.strokeCap = "ROUND"; v.strokeJoin = "ROUND";
      c.appendChild(v); v.x = p.x; v.y = p.y;
      v.constraints = { horizontal: "SCALE", vertical: "SCALE" };
      fresh.push(c);
    }
    if (!ICON_SET && fresh.length) {
      const sec = getSection(cmpPage, "UI v2 · Icônes");
      ICON_SET = figma.combineAsVariants(fresh, sec);
      ICON_SET.name = "Icon";
      Object.assign(ICON_SET, { layoutMode: "HORIZONTAL", layoutWrap: "WRAP", itemSpacing: 16, counterAxisSpacing: 16,
        paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "AUTO" });
      ICON_SET.resize(24 * 12 + 16 * 11 + 48, ICON_SET.height);
      report.ds.push(`Icon : ${fresh.length} icônes`);
    } else if (ICON_SET) {
      for (const c of fresh) ICON_SET.appendChild(c);
      if (fresh.length) report.ds.push(`Icon : ${fresh.length} icônes ajoutées au set existant`);
    }
  }
  if (ICON_SET) for (const c of ICON_SET.children) ICON[c.name.replace(/^Name=/, "")] = c;
}

// Instance d'icône colorée à la taille voulue
function icon(name, size = 24, color = "ink") {
  const c = ICON[name] || ICON.box;
  if (!c) return frame(`icon-${name}`, { w: size, h: size });
  const i = c.createInstance();
  i.resize(size, size);
  const g = i.findOne(n => n.name === "Glyph");
  if (g) g.strokes = fill(color);
  i.name = `Icon/${name}`;
  return i;
}
