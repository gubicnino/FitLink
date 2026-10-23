// Prebere Firebase web konfiguracijo projekta (prek service accounta iz backenda)
// in zapiše webapp/.env.local, da lokalni webapp (npm run dev) uporablja
// lokalni backend in pravi Firebase projekt. Obstoječega webapp/.env ne spreminja.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVICE_ACCOUNT_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT ??
  resolve(ROOT, 'backend', 'src', 'main', 'resources', 'firebase-adminsdk.json');
export const WEBAPP_ENV_LOCAL = resolve(ROOT, 'webapp', '.env.local');
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8080';
const MGMT = 'https://firebase.googleapis.com/v1beta1';

async function getJson(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
  return res.json();
}

export async function writeWebappEnvLocal() {
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  const { access_token: token } = await admin.credential.cert(serviceAccount).getAccessToken();
  const projectId = serviceAccount.project_id;

  const { apps = [] } = await getJson(`${MGMT}/projects/${projectId}/webApps`, token);
  if (apps.length === 0) {
    throw new Error(`Projekt ${projectId} nima registrirane web aplikacije v Firebase konzoli.`);
  }
  const config = await getJson(
    `${MGMT}/projects/${projectId}/webApps/${apps[0].appId}/config`,
    token,
  );

  const env = [
    '# Ustvaril scripts/seed-test-data/firebase-web-config.mjs – lokalno testno okolje.',
    '# Vite ga naloži prek webapp/.env; gitignored (*.local).',
    `VITE_API_ORIGIN=${API_ORIGIN}`,
    `VITE_FIREBASE_API_KEY=${config.apiKey}`,
    `VITE_FIREBASE_AUTH_DOMAIN=${config.authDomain}`,
    `VITE_FIREBASE_PROJECT_ID=${config.projectId}`,
    `VITE_FIREBASE_STORAGE_BUCKET=${config.storageBucket ?? ''}`,
    `VITE_FIREBASE_MESSAGING_SENDER_ID=${config.messagingSenderId ?? ''}`,
    `VITE_FIREBASE_APP_ID=${config.appId}`,
    '',
  ].join('\n');

  writeFileSync(WEBAPP_ENV_LOCAL, env);
  return { projectId, apiKey: config.apiKey };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { projectId } = await writeWebappEnvLocal();
  console.log(`Zapisano: ${WEBAPP_ENV_LOCAL} (projekt ${projectId})`);
}
