/**
 * Capture d'écran d'une sortie de terminal (docs/ci.md).
 *
 *   make test 2>&1 | tee sortie.log
 *   node docs/captures/capture-terminal.mjs sortie.log "make test" docs/captures/02-make-test.png
 *
 * Prend la sortie RÉELLE d'une commande (couleurs ANSI comprises), la met en
 * page comme une fenêtre de terminal, et en fait une image avec Chrome ou
 * Edge sans fenêtre. Rien n'est retouché : les lignes sont celles du journal.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [log, command, out, keep] = process.argv.slice(2);
if (!log || !command || !out) {
  console.error('usage : node capture-terminal.mjs <sortie.log> "<commande>" <image.png> [nombre de dernières lignes]');
  process.exit(1);
}

const COLORS = { 30: '#1e2127', 31: '#ef596f', 32: '#89ca78', 33: '#e5c07b', 34: '#61afef', 35: '#d55fde', 36: '#2bbac5', 37: '#abb2bf', 90: '#7f848e', 91: '#ff7b86', 92: '#a5e075', 93: '#f0d58c', 94: '#7cc4ff', 95: '#e88ff2', 96: '#5fd7e0', 97: '#ffffff' };
const BACKGROUNDS = { 41: '#be2f3f', 42: '#3f8f3a', 43: '#a8862d', 44: '#2f6db5', 47: '#d0d4db' };
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Les séquences de couleur ANSI (SGR) traduites en <span> ; les autres séquences sont retirées. */
function toHtml(line) {
  let html = '';
  let open = false;
  let style = {};
  for (const part of line.split(/(\x1b\[[0-9;]*m)/)) {
    const sgr = part.match(/^\x1b\[([0-9;]*)m$/);
    if (!sgr) {
      html += escape(part.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ''));
      continue;
    }
    for (const code of (sgr[1] || '0').split(';').map(Number)) {
      if (code === 0) style = {};
      else if (code === 1) style.bold = true;
      else if (code === 22) delete style.bold;
      else if (code === 4) style.underline = true;
      else if (code === 24) delete style.underline;
      else if (code === 39) delete style.color;
      else if (code === 49) delete style.background;
      else if (COLORS[code]) style.color = COLORS[code];
      else if (BACKGROUNDS[code]) style.background = BACKGROUNDS[code];
    }
    if (open) html += '</span>';
    const css = [
      style.color && `color:${style.color}`,
      style.background && `background:${style.background}`,
      style.bold && 'font-weight:700',
      style.underline && 'text-decoration:underline',
    ].filter(Boolean);
    open = css.length > 0;
    if (open) html += `<span style="${css.join(';')}">`;
  }
  return html + (open ? '</span>' : '');
}

let lines = readFileSync(log, 'utf8').replace(/\r/g, '').split('\n');
while (lines.length && lines.at(-1).trim() === '') lines.pop();
if (keep) lines = lines.slice(-Number(keep));
const width = Math.min(1600, Math.max(900, 9 * Math.max(...lines.map((l) => l.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').length)) + 60));
const height = lines.length * 19 + 90;

const page = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: #1e2127; }
  .bar { height: 34px; background: #2c313a; display: flex; align-items: center; padding: 0 14px; gap: 8px; font: 13px system-ui, sans-serif; color: #abb2bf; }
  .dot { width: 12px; height: 12px; border-radius: 50%; } .r { background: #ff5f57 } .y { background: #febc2e } .g { background: #28c840 }
  .title { margin-left: 12px; }
  pre { margin: 0; padding: 14px 18px; font: 14px/19px 'Cascadia Mono', Consolas, 'DejaVu Sans Mono', monospace; color: #abb2bf; white-space: pre; }
  .prompt { color: #89ca78; }
</style>
<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="title">Penderie — ${escape(command)}</span></div>
<pre><span class="prompt">$ </span>${escape(command)}
${lines.map(toHtml).join('\n')}</pre>`;

const html = join(tmpdir(), `capture-${Date.now()}.html`);
writeFileSync(html, page);
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const browser = browsers.find((b) => existsSync(b));
if (!browser) throw new Error('Chrome ou Edge introuvable');
execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${width},${height + 19}`, `--screenshot=${resolve(out)}`, `file:///${html.replace(/\\/g, '/')}`], { stdio: 'ignore' });
console.log(`${out} (${width}×${height + 19})`);
