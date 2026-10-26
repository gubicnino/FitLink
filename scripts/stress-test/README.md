# Stresni test backenda (k6)

Breakpoint test: obremenitev narašča, dokler backend ne odpove. Cilj je najti točko odpovedi.

## Priprava (enkrat)

```bash
winget install GrafanaLabs.k6                      # orodje k6
docker compose up -d                               # v korenski mapi: backend + MongoDB
cd scripts/seed-test-data && npm install
```

## Izvedba

```bash
# 1. Ponastavi podatke (pred vsako izvedbo)
cd scripts/seed-test-data && npm run seed:stress

# 2. V drugem terminalu (Git Bash): spremljanje CPU/RAM kontejnerjev
cd scripts/stress-test && ./monitor.sh

# 3. Kratka preverba (30 s, 5 zahtevkov/s)
cd scripts/stress-test
k6 run -e PROFILE=smoke stress.js

# 4. Stresni test
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=results/dashboard.html \
  k6 run --summary-export=results/summary.json stress.js
```

V PowerShellu namesto 4. koraka:

```powershell
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="results/dashboard.html"
k6 run --summary-export=results/summary.json stress.js
```

Med testom je nadzorna plošča v živo na http://127.0.0.1:5665. Po koncu ostanejo v `results/`:

| Datoteka | Vsebina |
|---|---|
| `dashboard.html` | Grafi skozi čas: RPS, odzivni časi, napake. Iz njih odčitaš točko odpovedi |
| `summary.json` | Končni povzetek: p95/p99 po endpointih, delež napak |
| `docker-stats.csv` | CPU in pomnilnik backenda ter MongoDB |

## Zasnova testa

| | |
|---|---|
| Uporabnik | `stres.trener@fitlink.test`: trener z 20 varovanci (20 pogovorov × 200 sporočil, 600 vadb, 60 predlog) |
| Profil obremenitve | `ramping-arrival-rate`: od 10 do 1000 zahtevkov/s v 15 min (enakomerno naraščanje) |
| Kriterij "ustreza" | p95 < 500 ms, napake < 1 % |
| Kriterij odpovedi | p95 > 2 s ali napake > 5 % → test se sam ustavi (`abortOnFail`) |
| Timeout zahtevka | 10 s (daljši zahtevek šteje kot napaka) |
| Push obvestila (FCM) | izklopljena: noben testni uporabnik nima push tokena |

Mešanica zahtevkov:

| Utež | Zahtevek |
|---|---|
| 25 % | `GET /api/chat/conversations` |
| 20 % | `GET /api/chat/conversations/{id}/messages?limit=50` |
| 15 % | `GET /api/auth/me` |
| 10 % | `GET /api/workouts/sessions/trainee/{id}` |
| 5 % | `GET /api/workouts/templates/trainee/{id}` |
| 10 % | `GET /api/exercises?q=...` |
| 5 % | `GET /api/exercises/facets` |
| 5 % | `GET /api/coaching/active` |
| 5 % | `POST /api/chat/conversations/{id}/messages` |

## Nastavitve (`k6 run -e IME=vrednost`)

| Spremenljivka | Privzeto | |
|---|---|---|
| `PROFILE` | `breakpoint` | `smoke` za kratko preverbo |
| `MAX_RPS` | `1000` | ciljni zahtevki/s ob koncu naraščanja |
| `RAMP` | `15m` | trajanje naraščanja (Firebase token velja 1 h) |
| `MAX_VUS` | `2000` | največ sočasnih navideznih uporabnikov |
| `API_ORIGIN` | `http://localhost:8080` | |
| `FIREBASE_API_KEY` | iz `webapp/.env.local` | |

## Branje rezultatov

Abort pogoji v k6 se računajo **kumulativno od začetka testa**, zato se test ustavi nekoliko za dejansko točko odpovedi. Točko odpovedi odčitaj iz grafa v `dashboard.html`: to je RPS, pri katerem p95 začne strmo naraščati oziroma se pojavijo napake. Znak preobremenitve je tudi metrika `dropped_iterations`, ki pomeni, da k6 ni mogel poslati zahtevka, ker so bili vsi navidezni uporabniki zasedeni s čakanjem na odgovor.
