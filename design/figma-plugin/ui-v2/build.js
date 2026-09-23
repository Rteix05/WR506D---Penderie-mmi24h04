// Assemble les modules ui-v2 en un seul script à coller dans Scripter.
// Usage : node build.js  →  ../dist/penderie-ui-v2.js
const fs = require("fs"), path = require("path");
const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => /^\d\d[a-z]?-.*\.js$/.test(f)).sort();
const out = files.map(f => `// ── ${f} ──\n${fs.readFileSync(path.join(dir, f), "utf8")}`).join("\n\n");
const dist = path.join(dir, "..", "dist");
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, "penderie-ui-v2.js"), out);
// Contrôle de syntaxe (le script tourne dans une fonction asynchrone, comme dans Scripter)
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
new AsyncFn("figma", "print", out);
console.log(`OK · ${files.length} modules · ${out.split("\n").length} lignes → dist/penderie-ui-v2.js`);
