// Pripravi (in ob vsakem zagonu ponastavi) testne podatke za
// docs/Testni-scenariji-webapp.md – TS-01, TS-02, TS-03.
//
// Predpogoj: docker compose up (backend + mongodb) teče.
// Zagon:     cd scripts/seed-test-data && npm install && npm run seed
//
// Skripta je idempotentna: obstoječe testne račune posodobi, prijave in
// predloge testnih uporabnikov pobriše in jih ustvari na novo.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { MongoClient } from 'mongodb';
import { WEBAPP_ENV_LOCAL, writeWebappEnvLocal } from './firebase-web-config.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MONGO_URI = process.env.SEED_MONGO_URI ?? 'mongodb://localhost:27017/fitlink';
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8080';
const SERVICE_ACCOUNT_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT ??
  resolve(ROOT, 'backend', 'src', 'main', 'resources', 'firebase-adminsdk.json');

const PASSWORD = process.env.SEED_PASSWORD ?? 'FitLinkTest!2026';

// TD-01 … TD-05 iz poglavja 4.2
const ACCOUNTS = {
  admin: { email: 'admin.test@fitlink.test', displayName: 'Test Admin', role: 'ADMIN' },
  trainer: { email: 'trener.test@fitlink.test', displayName: 'Test Trener', role: 'TRAINER' },
  client: { email: 'stranka.test@fitlink.test', displayName: 'Test Stranka', role: 'TRAINEE' },
  applicantA: { email: 'kandidat.a@fitlink.test', displayName: 'Kandidat Ana', role: 'TRAINEE' },
  applicantB: { email: 'kandidat.b@fitlink.test', displayName: 'Kandidat Bor', role: 'TRAINEE' },
};

const APPLICATIONS = [
  {
    account: 'applicantA',
    bio: 'Osebna trenerka z 5 leti izkušenj v fitnesu.',
    specializations: ['Moč', 'Hujšanje'],
  },
  {
    account: 'applicantB',
    bio: 'Kondicijski trener, specializiran za vzdržljivost.',
    specializations: ['Vzdržljivost', 'Mobilnost'],
  },
];

const step = (msg) => console.log(`\n▸ ${msg}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

async function checkBackend() {
  try {
    await fetch(`${API_ORIGIN}/actuator/health`, { signal: AbortSignal.timeout(5000) });
  } catch {
    fail(
      `Backend ni dosegljiv na ${API_ORIGIN}.\n` +
        '  Zaženi ga v korenski mapi: docker compose up -d --build',
    );
  }
}

async function getWebApiKey() {
  if (!existsSync(WEBAPP_ENV_LOCAL)) {
    const { apiKey } = await writeWebappEnvLocal();
    ok(`ustvarjen ${WEBAPP_ENV_LOCAL}`);
    return apiKey;
  }
  const line = readFileSync(WEBAPP_ENV_LOCAL, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('VITE_FIREBASE_API_KEY='));
  return line?.split('=')[1]?.trim() || (await writeWebappEnvLocal()).apiKey;
}

async function upsertFirebaseUser(auth, { email, displayName }) {
  const props = { email, displayName, password: PASSWORD, emailVerified: true, disabled: false };
  let user;
  try {
    const existing = await auth.getUserByEmail(email);
    user = await auth.updateUser(existing.uid, props);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    user = await auth.createUser(props);
  }
  // Backend najprej bere vlogo iz custom claima – brez claima uporabi vlogo iz MongoDB.
  await auth.setCustomUserClaims(user.uid, null);
  return user.uid;
}

async function upsertMongoUser(users, uid, { email, displayName, role }) {
  const now = new Date();
  const set = { firebaseUid: uid, email, displayName, role, updatedAt: now };
  const update = { $set: set, $setOnInsert: { createdAt: now } };
  if (role === 'TRAINER') {
    set.trainer = {
      verificationStatus: 'APPROVED',
      bio: 'Testni trener za funkcionalno testiranje.',
      location: 'Maribor',
      specializations: ['Moč', 'Hipertrofija'],
      verifiedAt: now,
      rejectionReason: null,
    };
  } else {
    update.$unset = { trainer: '' };
  }
  await users.updateOne({ firebaseUid: uid }, update, { upsert: true });
  return (await users.findOne({ firebaseUid: uid }, { projection: { _id: 1 } }))._id.toString();
}

async function signIn(apiKey, email) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    },
  );
  const body = await res.json();
  if (!res.ok) fail(`Prijava ${email} v Firebase ni uspela: ${body.error?.message}`);
  return body.idToken;
}

async function api(path, idToken, init = {}) {
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${idToken}`, ...init.headers },
  });
  const text = await res.text();
  if (!res.ok) fail(`${init.method ?? 'GET'} /api${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Minimalen veljaven enostranski PDF z napisom certifikata. */
function buildCertificatePdf(name) {
  const text = `FitLink testni certifikat - ${name}`.replace(/[()\\]/g, '');
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((obj, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

/** Odda prijavo prek pravega API-ja (kot mobilna aplikacija), da backend shrani certifikat. */
async function submitApplication(apiKey, account, { bio, specializations }) {
  const idToken = await signIn(apiKey, account.email);
  const form = new FormData();
  const pdf = buildCertificatePdf(account.displayName);
  form.append('file', new Blob([pdf], { type: 'application/pdf' }), 'certifikat.pdf');

  const cert = await api('/trainer-applications/certification', idToken, {
    method: 'POST',
    body: form,
  });
  return api('/trainer-applications', idToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bio, specializations, ...cert }),
  });
}

async function main() {
  console.log('FitLink – priprava testnih podatkov');
  console.log(`  MongoDB: ${MONGO_URI}\n  Backend: ${API_ORIGIN}`);

  step('Preverjam backend in Firebase konfiguracijo');
  await checkBackend();
  ok('backend dosegljiv');
  const apiKey = await getWebApiKey();
  ok('Firebase web API ključ najden');

  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const auth = admin.auth();

  const mongo = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongo.connect().catch((e) => fail(`MongoDB ni dosegljiv (${MONGO_URI}): ${e.message}`));
  const db = mongo.db();

  try {
    const exerciseCount = await db.collection('exercises').countDocuments();
    if (exerciseCount === 0) fail('V bazi ni vaj – počakaj, da backend ob zagonu naloži seed vaj.');
    ok(`${exerciseCount} vaj v knjižnici`);

    step('Firebase računi in uporabniki v MongoDB (TD-01 … TD-05)');
    const uid = {};
    const mongoId = {};
    for (const [key, account] of Object.entries(ACCOUNTS)) {
      uid[key] = await upsertFirebaseUser(auth, account);
      mongoId[key] = await upsertMongoUser(db.collection('users'), uid[key], account);
      ok(`${account.role.padEnd(7)} ${account.email}`);
    }

    step('Aktivno sodelovanje trener ↔ stranka');
    const seededUids = Object.values(uid);
    await db.collection('coachings').deleteMany({
      $or: [{ trainerId: { $in: seededUids } }, { traineeId: { $in: seededUids } }],
    });
    await db.collection('coachings').insertOne({
      traineeId: uid.client,
      trainerId: uid.trainer,
      status: 'ACTIVE',
      requestMessage: 'Testno sodelovanje za funkcionalno testiranje.',
      startedAt: new Date(),
      checkIns: [],
    });
    ok(`${ACCOUNTS.trainer.displayName} → ${ACCOUNTS.client.displayName} (ACTIVE)`);

    step('Ponastavitev predlog treninga stranke (TS-03)');
    const { deletedCount } = await db
      .collection('workoutTemplates')
      .deleteMany({ ownerId: uid.client });
    ok(`pobrisanih predlog: ${deletedCount}`);

    step('Čakajoči prijavi za trenerja s certifikatom (TD-04, TD-05)');
    await db.collection('trainer_applications').deleteMany({
      userId: { $in: [mongoId.applicantA, mongoId.applicantB] },
    });
    for (const app of APPLICATIONS) {
      const account = ACCOUNTS[app.account];
      const application = await submitApplication(apiKey, account, app);
      ok(`${account.displayName}: ${application.status}, ${application.certificateFileName}`);
    }
  } finally {
    await mongo.close();
  }

  console.log('\n✔ Testni podatki pripravljeni. Geslo za vse račune:', PASSWORD);
  console.table(
    Object.values(ACCOUNTS).map(({ email, displayName, role }) => ({ email, displayName, role })),
  );
  process.exit(0);
}

main().catch((err) => fail(err.stack ?? String(err)));
