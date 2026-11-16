// Testni podatki TD-01 … TD-09 iz docs/Testni-scenariji-webapp.md, poglavje 4.2.
const PASSWORD = process.env.SEED_PASSWORD ?? 'FitLinkTest!2026';

export const TD = {
  trainer: { email: 'trener.test@fitlink.test', password: PASSWORD, clientName: 'Test Stranka' }, // TD-01
  admin: { email: 'admin.test@fitlink.test', password: PASSWORD }, // TD-02
  wrongPassword: 'NapacnoGeslo123!', // TD-03
  applicantA: { name: 'Kandidat Ana', certificate: 'kandidat_ana_certification.pdf' }, // TD-04
  applicantB: { name: 'Kandidat Bor', email: 'kandidat.b@fitlink.test', password: PASSWORD }, // TD-05
  shortReason: 'abc', // TD-06
  validReason: 'Certifikat ni veljaven.', // TD-07
  templateName: 'Push dan A', // TD-08
  set: { count: 3, reps: 10, weightKg: 60, restLabel: '1m 30s' }, // TD-09
  exercise: { query: 'bench press', name: 'Barbell Bench Press - Medium Grip' },
} as const;
