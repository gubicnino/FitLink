# Testni podatki za funkcionalne teste webappa

Pripravi podatke za scenarije v [docs/Testni-scenariji-webapp.md](../../docs/Testni-scenariji-webapp.md) (poglavje 4.2).

## Zagon

```bash
docker compose up -d --build        # v korenski mapi: backend + MongoDB
cd scripts/seed-test-data
npm install                         # samo prvič
npm run seed
```

Skripto zaženi **pred vsako izvedbo testov** – ponastavi podatke v začetno stanje.

## Kaj naredi

| Korak | Kje |
|---|---|
| Ustvari ali posodobi 5 testnih računov (`*@fitlink.test`) z enakim geslom in brez custom claimov | Firebase Authentication (projekt iz `backend/src/main/resources/firebase-adminsdk.json`) |
| Zapiše uporabnike z vlogami ADMIN, TRAINER, TRAINEE | MongoDB `users` |
| Ustvari aktivno sodelovanje *Test Trener → Test Stranka* | MongoDB `coachings` |
| Pobriše predloge treninga testne stranke | MongoDB `workoutTemplates` |
| Odda dve prijavi za trenerja s PDF certifikatom prek API-ja | backend `/api/trainer-applications` |
| Če manjka, ustvari `webapp/.env.local` (Firebase web config + lokalni backend) | `firebase-web-config.mjs` |

Briše samo podatke testnih računov, ostale podatke v bazi pusti pri miru.

## Nastavitve (spremenljivke okolja)

| Spremenljivka | Privzeto |
|---|---|
| `SEED_MONGO_URI` | `mongodb://localhost:27017/fitlink` |
| `API_ORIGIN` | `http://localhost:8080` |
| `SEED_PASSWORD` | `FitLinkTest!2026` |
| `FIREBASE_SERVICE_ACCOUNT` | `backend/src/main/resources/firebase-adminsdk.json` |
