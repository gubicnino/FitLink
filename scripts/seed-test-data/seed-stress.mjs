// Pripravi (in ob vsakem zagonu ponastavi) podatke za stresni test backenda
// (scripts/stress-test/stress.js).
//
// Predpogoj: docker compose up (backend + mongodb) teče.
// Zagon:     cd scripts/seed-test-data && npm install && npm run seed:stress
//
// Ustvari enega trenerja s Firebase računom (samo on se prijavlja v k6) in
// N varovancev, ki obstajajo samo v MongoDB. Za vsakega varovanca: aktivno
// sodelovanje, pogovor s sporočili in potrdili o branju, opravljene vadbe in
// predloge. Nihče od uporabnikov nima push tokena, zato pošiljanje sporočil
// ne sproži klicev na FCM.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import admin from 'firebase-admin';
import { MongoClient, ObjectId } from 'mongodb';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MONGO_URI = process.env.SEED_MONGO_URI ?? 'mongodb://localhost:27017/fitlink';
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8080';
const SERVICE_ACCOUNT_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT ??
  resolve(ROOT, 'backend', 'src', 'main', 'resources', 'firebase-adminsdk.json');

const PASSWORD = process.env.SEED_PASSWORD ?? 'FitLinkTest!2026';
const TRAINER = { email: 'stres.trener@fitlink.test', displayName: 'Stres Trener', role: 'TRAINER' };

const TRAINEES = Number(process.env.STRESS_TRAINEES ?? 20);
const MESSAGES_PER_CONV = Number(process.env.STRESS_MESSAGES_PER_CONV ?? 200);
const UNREAD_PER_CONV = Number(process.env.STRESS_UNREAD_PER_CONV ?? 5);
const SESSIONS_PER_TRAINEE = Number(process.env.STRESS_SESSIONS_PER_TRAINEE ?? 30);
const TEMPLATES_PER_TRAINEE = Number(process.env.STRESS_TEMPLATES_PER_TRAINEE ?? 3);

const TRAINEE_UID_PREFIX = 'stress-trainee-';
const DAY_MS = 24 * 60 * 60 * 1000;

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
  // Brez claima backend vlogo prebere iz MongoDB – kot pri pravih uporabnikih.
  await auth.setCustomUserClaims(user.uid, null);
  return user.uid;
}

/** Upsert uporabnika brez push tokenov – FCM se med testom ne kliče. */
async function upsertMongoUser(users, uid, { email, displayName, role }) {
  const now = new Date();
  const set = { firebaseUid: uid, email, displayName, role, updatedAt: now };
  if (role === 'TRAINER') {
    set.trainer = {
      verificationStatus: 'APPROVED',
      bio: 'Testni trener za stresno testiranje.',
      location: 'Maribor',
      specializations: ['Moč', 'Hipertrofija'],
      verifiedAt: now,
      rejectionReason: null,
    };
  }
  await users.updateOne(
    { firebaseUid: uid },
    {
      $set: set,
      $setOnInsert: { createdAt: now },
      $unset: { fcmToken: '', expoPushToken: '' },
    },
    { upsert: true },
  );
}

const traineeUid = (i) => `${TRAINEE_UID_PREFIX}${String(i + 1).padStart(2, '0')}`;

async function resetStressData(db, trainerUid) {
  const convIds = (
    await db
      .collection('conversations')
      .find({ participantIds: trainerUid }, { projection: { _id: 1 } })
      .toArray()
  ).map((c) => c._id.toString());

  const traineeFilter = { $regex: `^${TRAINEE_UID_PREFIX}` };
  const results = await Promise.all([
    db.collection('messages').deleteMany({ conversationId: { $in: convIds } }),
    db.collection('messageReceipts').deleteMany({ conversationId: { $in: convIds } }),
    db.collection('conversationParticipants').deleteMany({ conversationId: { $in: convIds } }),
    db.collection('conversations').deleteMany({ participantIds: trainerUid }),
    db.collection('coachings').deleteMany({ trainerId: trainerUid }),
    db.collection('workoutSessions').deleteMany({ ownerId: traineeFilter }),
    db.collection('workoutTemplates').deleteMany({ ownerId: traineeFilter }),
    db.collection('users').deleteMany({ firebaseUid: traineeFilter }),
  ]);
  return results.reduce((sum, r) => sum + r.deletedCount, 0);
}

function buildSets(count, reps, weightKg) {
  return Array.from({ length: count }, () => ({
    reps,
    weightKg,
    rpe: 8,
    completed: true,
    setType: 'NORMAL',
  }));
}

function buildTemplates(ownerId, trainerUid, exerciseIds, now) {
  return Array.from({ length: TEMPLATES_PER_TRAINEE }, (_, t) => ({
    ownerId,
    createdBy: trainerUid,
    name: `Trening ${String.fromCharCode(65 + t)}`,
    exercises: exerciseIds.slice(t * 5, t * 5 + 5).map((exerciseId, order) => ({
      exerciseId,
      order,
      sets: Array.from({ length: 3 }, () => ({
        targetReps: 10,
        targetWeightKg: 40,
        restSeconds: 90,
        setType: 'NORMAL',
      })),
      notes: null,
    })),
    lastEditedBy: trainerUid,
    lastEditedAt: now,
    createdAt: now,
    _class: 'si.feri.fitlink.workout.WorkoutTemplate',
  }));
}

function buildSessions(ownerId, exerciseIds, now) {
  return Array.from({ length: SESSIONS_PER_TRAINEE }, (_, s) => {
    const startedAt = new Date(now.getTime() - (s + 1) * DAY_MS);
    return {
      ownerId,
      templateId: null,
      name: `Vadba ${s + 1}`,
      startedAt,
      finishedAt: new Date(startedAt.getTime() + 60 * 60 * 1000),
      durationMinutes: 60,
      exercises: exerciseIds.slice((s % 3) * 5, (s % 3) * 5 + 5).map((exerciseId) => ({
        exerciseId,
        sets: buildSets(3, 10, 40 + s),
        notes: null,
      })),
      videoUrls: [],
      trainerComment: null,
      _class: 'si.feri.fitlink.workout.WorkoutSession',
    };
  });
}

/**
 * Sporočila izmenično pošiljata varovanec in trener. Za vsako sporočilo obstaja
 * potrdilo za prejemnika; zadnjih UNREAD_PER_CONV sporočil vsakega je neprebranih.
 */
function buildChat(conversationId, trainerUid, traineeId, now) {
  const messages = [];
  const receipts = [];
  const spacingMs = (30 * DAY_MS) / MESSAGES_PER_CONV;
  for (let m = 0; m < MESSAGES_PER_CONV; m++) {
    const fromTrainee = m % 2 === 0;
    const sentAt = new Date(now.getTime() - (MESSAGES_PER_CONV - m) * spacingMs);
    const message = {
      _id: new ObjectId(),
      conversationId,
      senderId: fromTrainee ? traineeId : trainerUid,
      clientMessageId: randomUUID(),
      type: 'TEXT',
      text: fromTrainee
        ? `Danes sem opravil vadbo, vse serije sem naredil (${m + 1}).`
        : `Odlično, naslednjič dodaj 2,5 kg (${m + 1}).`,
      attachments: [],
      sentAt,
      _class: 'si.feri.fitlink.chat.domain.Message',
    };
    messages.push(message);
    const isUnread = m >= MESSAGES_PER_CONV - UNREAD_PER_CONV * 2;
    receipts.push({
      messageId: message._id.toString(),
      conversationId,
      userId: fromTrainee ? trainerUid : traineeId,
      deliveredAt: sentAt,
      readAt: isUnread ? null : new Date(sentAt.getTime() + 60 * 1000),
      _class: 'si.feri.fitlink.chat.domain.MessageReceipt',
    });
  }
  return { messages, receipts };
}

async function seedTrainee(db, i, trainerUid, exerciseIds) {
  const now = new Date();
  const traineeId = traineeUid(i);
  await upsertMongoUser(db.collection('users'), traineeId, {
    email: `stres.varovanec${String(i + 1).padStart(2, '0')}@fitlink.test`,
    displayName: `Stres Varovanec ${i + 1}`,
    role: 'TRAINEE',
  });

  const coachingId = new ObjectId();
  await db.collection('coachings').insertOne({
    _id: coachingId,
    traineeId,
    trainerId: trainerUid,
    status: 'ACTIVE',
    requestMessage: 'Sodelovanje za stresni test.',
    startedAt: new Date(now.getTime() - 60 * DAY_MS),
    checkIns: [],
    _class: 'si.feri.fitlink.coaching.Coaching',
  });

  const conversationId = new ObjectId();
  const { messages, receipts } = buildChat(conversationId.toString(), trainerUid, traineeId, now);
  const last = messages[messages.length - 1];
  await db.collection('conversations').insertOne({
    _id: conversationId,
    type: 'DIRECT',
    coachingId: coachingId.toString(),
    participantIds: [trainerUid, traineeId],
    createdAt: new Date(now.getTime() - 60 * DAY_MS),
    updatedAt: last.sentAt,
    lastMessage: {
      id: last._id.toString(),
      text: last.text,
      senderId: last.senderId,
      sentAt: last.sentAt,
      hasAttachments: false,
    },
    archived: false,
    _class: 'si.feri.fitlink.chat.domain.Conversation',
  });
  await db.collection('conversationParticipants').insertMany(
    [trainerUid, traineeId].map((userId) => ({
      conversationId: conversationId.toString(),
      userId,
      joinedAt: new Date(now.getTime() - 60 * DAY_MS),
      muted: false,
      role: 'MEMBER',
      _class: 'si.feri.fitlink.chat.domain.ConversationParticipant',
    })),
  );
  await db.collection('messages').insertMany(messages);
  await db.collection('messageReceipts').insertMany(receipts);

  await db.collection('workoutSessions').insertMany(buildSessions(traineeId, exerciseIds, now));
  await db
    .collection('workoutTemplates')
    .insertMany(buildTemplates(traineeId, trainerUid, exerciseIds, now));
}

async function main() {
  console.log('FitLink – priprava podatkov za stresni test');
  console.log(`  MongoDB: ${MONGO_URI}\n  Backend: ${API_ORIGIN}`);

  step('Preverjam backend');
  await checkBackend();
  ok('backend dosegljiv');

  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  const mongo = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongo.connect().catch((e) => fail(`MongoDB ni dosegljiv (${MONGO_URI}): ${e.message}`));
  const db = mongo.db();

  try {
    const exerciseIds = (
      await db.collection('exercises').find({}, { projection: { _id: 1 } }).limit(15).toArray()
    ).map((e) => e._id.toString());
    if (exerciseIds.length < 15) fail('V bazi ni vaj – počakaj, da backend ob zagonu naloži seed vaj.');

    step('Trener (Firebase + MongoDB)');
    const trainerUid = await upsertFirebaseUser(admin.auth(), TRAINER);
    await upsertMongoUser(db.collection('users'), trainerUid, TRAINER);
    ok(`${TRAINER.email} (${trainerUid})`);

    step('Brišem podatke prejšnjega zagona');
    ok(`pobrisanih dokumentov: ${await resetStressData(db, trainerUid)}`);

    step(`Varovanci, pogovori in vadbe (${TRAINEES}×)`);
    for (let i = 0; i < TRAINEES; i++) {
      await seedTrainee(db, i, trainerUid, exerciseIds);
    }
    ok(`${TRAINEES} varovancev, ${TRAINEES} aktivnih sodelovanj in pogovorov`);
    ok(`${TRAINEES * MESSAGES_PER_CONV} sporočil, ${UNREAD_PER_CONV} neprebranih za trenerja na pogovor`);
    ok(`${TRAINEES * SESSIONS_PER_TRAINEE} opravljenih vadb, ${TRAINEES * TEMPLATES_PER_TRAINEE} predlog`);

    step('Preverjam push tokene (FCM mora biti izklopljen)');
    const stressUids = [trainerUid, ...Array.from({ length: TRAINEES }, (_, i) => traineeUid(i))];
    const withToken = await db.collection('users').countDocuments({
      firebaseUid: { $in: stressUids },
      $or: [{ fcmToken: { $nin: [null, ''] } }, { expoPushToken: { $nin: [null, ''] } }],
    });
    if (withToken > 0) fail(`${withToken} stresnih uporabnikov ima push token – FCM bi se klical.`);
    ok('noben stresni uporabnik nima push tokena');
  } finally {
    await mongo.close();
  }

  console.log(`\n✔ Podatki pripravljeni. Prijava v k6: ${TRAINER.email} / ${PASSWORD}`);
  process.exit(0);
}

main().catch((err) => fail(err.stack ?? String(err)));
