// Stresni test (breakpoint) backenda FitLink.
//
// Obremenitev s stalnim tempom zahtevkov (open model) linearno narašča, dokler
// sistem ne prekrši kriterijev odpovedi – takrat se test sam ustavi.
// Predpogoj: npm run seed:stress (scripts/seed-test-data).
//
// Zagon:  k6 run stress.js                 (breakpoint test)
//         k6 run -e PROFILE=smoke stress.js (kratka preverba, da vse deluje)
import http from 'k6/http';
import { check, fail } from 'k6';

const API = `${__ENV.API_ORIGIN || 'http://localhost:8080'}/api`;
const EMAIL = __ENV.EMAIL || 'stres.trener@fitlink.test';
const PASSWORD = __ENV.PASSWORD || 'FitLinkTest!2026';
const MAX_RPS = Number(__ENV.MAX_RPS || 1000);
const RAMP = __ENV.RAMP || '15m';

// Pri preobremenitvi zahtevek po tem času šteje kot napaka (privzeto bi visel 60 s).
const REQUEST_TIMEOUT = '10s';
const SEARCH_TERMS = ['press', 'squat', 'curl', 'row', 'deadlift', 'lunge', 'raise', 'pull'];

/** Firebase web API ključ: iz -e FIREBASE_API_KEY ali iz webapp/.env.local (ustvari ga seed). */
function firebaseApiKey() {
  if (__ENV.FIREBASE_API_KEY) return __ENV.FIREBASE_API_KEY;
  try {
    const line = open('../../webapp/.env.local')
      .split(/\r?\n/)
      .find((l) => l.startsWith('VITE_FIREBASE_API_KEY='));
    if (line) return line.split('=')[1].trim();
  } catch (_) {
    // datoteke ni – javimo spodaj
  }
  throw new Error('Manjka Firebase API ključ: podaj -e FIREBASE_API_KEY=... ali zaženi seed.');
}
const FIREBASE_API_KEY = firebaseApiKey();

const SCENARIOS = {
  smoke: {
    executor: 'constant-arrival-rate',
    rate: 5,
    timeUnit: '1s',
    duration: '30s',
    preAllocatedVUs: 10,
  },
  breakpoint: {
    executor: 'ramping-arrival-rate',
    startRate: 10,
    timeUnit: '1s',
    preAllocatedVUs: 100,
    maxVUs: Number(__ENV.MAX_VUS || 2000),
    stages: [{ target: MAX_RPS, duration: RAMP }],
  },
};

const ENDPOINTS = [
  'conversations',
  'messages',
  'auth_me',
  'trainee_sessions',
  'trainee_templates',
  'exercise_search',
  'exercise_facets',
  'coaching_active',
  'send_message',
];

export const options = {
  scenarios: { load: SCENARIOS[__ENV.PROFILE || 'breakpoint'] },
  thresholds: {
    // Prvi pogoj = kriterij "sistem ustreza" (informativno).
    // Drugi pogoj = kriterij odpovedi – ko ga sistem prekrši, se test ustavi.
    http_req_failed: [
      'rate<0.01',
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' },
    ],
    http_req_duration: [
      'p(95)<500',
      { threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '30s' },
    ],
    // Po endpointih – da povzetek izpiše p95 za vsakega posebej.
    ...Object.fromEntries(ENDPOINTS.map((e) => [`http_req_duration{endpoint:${e}}`, ['p(95)<500']])),
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const login = http.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'setup' } },
  );
  if (login.status !== 200) fail(`Firebase prijava ni uspela (${login.status}): ${login.body}`);
  const token = login.json('idToken');
  const params = { headers: { Authorization: `Bearer ${token}` }, tags: { endpoint: 'setup' } };

  const me = http.get(`${API}/auth/me`, params);
  if (me.status !== 200 || me.json('role') !== 'TRAINER') {
    fail(`/auth/me: pričakovan TRAINER, dobil ${me.status} ${me.body}`);
  }
  const myUid = me.json('firebaseUid');

  const convs = http.get(`${API}/chat/conversations`, params);
  const conversations = convs.status === 200 ? convs.json() : [];
  if (conversations.length === 0) fail('Trener nima pogovorov – zaženi npm run seed:stress.');

  return {
    token,
    conversationIds: conversations.map((c) => c.id),
    traineeIds: conversations.flatMap((c) =>
      c.participants.map((p) => p.userId).filter((uid) => uid !== myUid),
    ),
  };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function get(endpoint, path, params) {
  const res = http.get(`${API}${path}`, { ...params, tags: { endpoint } });
  check(res, { [`${endpoint} 200`]: (r) => r.status === 200 });
}

function sendMessage(data, params) {
  const res = http.post(
    `${API}/chat/conversations/${pick(data.conversationIds)}/messages`,
    JSON.stringify({
      clientMessageId: `k6-${__VU}-${__ITER}-${Date.now()}`,
      text: 'Sporočilo iz stresnega testa.',
    }),
    {
      ...params,
      headers: { ...params.headers, 'Content-Type': 'application/json' },
      tags: { endpoint: 'send_message' },
    },
  );
  check(res, { 'send_message 201': (r) => r.status === 201 });
}

/** Mešanica zahtevkov z utežmi (vsota 100), približek realne uporabe trenerja. */
const MIX = [
  { weight: 25, run: (d, p) => get('conversations', '/chat/conversations', p) },
  {
    weight: 20,
    run: (d, p) =>
      get('messages', `/chat/conversations/${pick(d.conversationIds)}/messages?limit=50`, p),
  },
  { weight: 15, run: (d, p) => get('auth_me', '/auth/me', p) },
  {
    weight: 10,
    run: (d, p) => get('trainee_sessions', `/workouts/sessions/trainee/${pick(d.traineeIds)}`, p),
  },
  {
    weight: 5,
    run: (d, p) => get('trainee_templates', `/workouts/templates/trainee/${pick(d.traineeIds)}`, p),
  },
  { weight: 10, run: (d, p) => get('exercise_search', `/exercises?q=${pick(SEARCH_TERMS)}`, p) },
  { weight: 5, run: (d, p) => get('exercise_facets', '/exercises/facets', p) },
  { weight: 5, run: (d, p) => get('coaching_active', '/coaching/active', p) },
  { weight: 5, run: (d, p) => sendMessage(d, p) },
];

export default function (data) {
  const params = { headers: { Authorization: `Bearer ${data.token}` }, timeout: REQUEST_TIMEOUT };
  let roll = Math.random() * 100;
  for (const action of MIX) {
    roll -= action.weight;
    if (roll < 0) return action.run(data, params);
  }
}
