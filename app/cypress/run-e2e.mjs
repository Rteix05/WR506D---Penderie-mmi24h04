/**
 * Campagne de bout en bout en une commande (make e2e) :
 *   1. construit la version web de l'app (export de production), branchée
 *      sur l'API e2e (port 8090, base penderie_e2e remplie par les fixtures) ;
 *   2. la sert en local (port 8082) ;
 *   3. lance Cypress (sans fenêtre : `run`, ou l'interface : `open`) ;
 *   4. arrête le serveur, et rend le code de sortie de Cypress.
 *
 * L'export plutôt que le serveur de développement d'Expo : c'est l'app telle
 * qu'elle est livrée, sans la fenêtre d'erreurs de développement (LogBox) qui
 * recouvre l'écran, et un chargement en quelques secondes au lieu d'une
 * compilation à la demande.
 *
 * En Node plutôt qu'en shell : même comportement sous Windows, macOS, Linux
 * et dans la CI.
 *
 *   node cypress/run-e2e.mjs        # campagne complète
 *   node cypress/run-e2e.mjs open   # interface de Cypress (démonstration)
 */
import { spawn } from 'node:child_process';

const mode = process.argv[2] === 'open' ? 'open' : 'run';
const port = process.env.APP_E2E_PORT ?? '8082';
const appUrl = `http://localhost:${port}`;
const apiUrl = process.env.API_E2E_URL ?? 'http://localhost:8090';
const outDir = 'dist-e2e';
const shell = process.platform === 'win32';

const env = { ...process.env, CI: '1', EXPO_PUBLIC_API_URL: apiUrl, APP_E2E_URL: appUrl };

/** Lance une commande et attend sa fin ; rejette si elle échoue. */
function run(command, args) {
  return new Promise((resolve, reject) => {
    spawn(command, args, { env, shell, stdio: 'inherit' }).on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} : code ${code}`)),
    );
  });
}

async function waitFor(url, seconds) {
  for (let i = 0; i < seconds; i++) {
    try {
      // 127.0.0.1 : Node résout « localhost » en IPv6 d'abord.
      const response = await fetch(url.replace('localhost', '127.0.0.1'));
      if (response.ok) return;
    } catch {
      // pas encore prêt
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${url} ne répond pas après ${seconds} s`);
}

let server;
function stop(code) {
  if (!server) process.exit(code);
  if (shell) {
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' }).on('exit', () => process.exit(code));
  } else {
    server.kill('SIGTERM');
    process.exit(code);
  }
}

try {
  console.log(`→ API e2e : ${apiUrl}`);
  await waitFor(`${apiUrl}/api`, 30);

  console.log(`→ export web de l'app (${outDir}/)`);
  await run('npx', ['expo', 'export', '--platform', 'web', '--output-dir', outDir, '--clear']);

  console.log(`→ app servie sur ${appUrl}`);
  server = spawn('npx', ['--yes', 'serve@14.2.4', '-s', outDir, '-l', port, '--no-request-logging'], { env, shell, stdio: 'ignore' });
  await waitFor(appUrl, 60);

  const args = mode === 'run' ? ['cypress', 'run', '--browser', 'electron'] : ['cypress', 'open', '--e2e'];
  spawn('npx', args, { env, shell, stdio: 'inherit' }).on('exit', (code) => stop(code ?? 1));
} catch (error) {
  console.error(`✗ ${error.message}`);
  stop(1);
}
