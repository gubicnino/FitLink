# FitLink

> Mobilna platforma za izmenjavo veščin in znanj na področju fitnesa, kjer trenerji delijo svoje strokovno znanje s treniranci, treniranci pa nudijo realne podatke o napredku in povratno informacijo.

Projekt nastaja v sklopu predmeta **Praktikum II** na FERI (Univerza v Mariboru).

---

## Vsebina

- [Pregled](#pregled)
- [Model izmenjave veščin](#model-izmenjave-veščin)
- [Funkcionalnosti](#funkcionalnosti)
- [Arhitektura](#arhitektura)
- [Tehnologije](#tehnologije)
- [Struktura repozitorija](#struktura-repozitorija)
- [Začetek razvoja](#začetek-razvoja)
- [Konfiguracija okolja](#konfiguracija-okolja)
- [Build & deploy](#build--deploy)
- [API dokumentacija](#api-dokumentacija)
- [Razvoj](#razvoj)
- [Skladnost s temo predmeta](#skladnost-s-temo-predmeta)

---

## Pregled

FitLink je Android aplikacija, ki uporabnikom omogoča sledenje treningov, pridobivanje zdravstvenih podatkov iz nosljivih naprav (Garmin, Apple Watch preko Health Connect) in povezavo z verificiranim trenerjem. Trenerji lahko poleg vodenja trenirancev objavljajo brezplačne izobraževalne tečaje na poljubne fitness in nutricionistične teme. Na ta način pride do izmenjave znanj in veščin.

### Kontekst izmenjave veščin

FitLink je **specializirana platforma za izmenjavo veščin** s področja fitnesa, prehrane in zdravja. Zasnovana je tako, da omogoča dvosmerno izmenjavo znanj:

- **Trenerji** delijo svoje strokovno znanje preko personaliziranih trening načrtov, izobraževalnih tečajev in povratne informacije o izvedbi vaj. Njihova kredibilnost je zagotovljena z **obveznim postopkom verifikacije licence**.
- **Treniranci** v zameno nudijo trenerjem realne podatke o izvedbi treningov, tedenske check-ine s sliko in podatke iz nosljivih naprav. S svojimi ocenami in komentarji na tečaje pomagajo skupnosti razlikovati kakovostno vsebino.
- **Skupnostni element** omogoča, da trenerji medsebojno ocenjujejo in komentirajo tečaje, kar dvigne kakovost izmenjane vsebine.

Sistem deluje na principu **strokovne izmenjave**: trener nudi mentorstvo in znanje, treniranec nudi zavezanost, podatke o napredku in povratno informacijo. Brezplačni javni tečaji omogočajo izmenjavo znanja tudi izven 1-na-1 odnosa.

**Ključne značilnosti:**

- Sledenje treningov v živo z beleženjem serij, ponovitev in tež (po vzoru Strong/Hevy).
- Trener-treniranec povezava s skupnim načrtovanjem treningov.
- Tedenski check-in s sliko, težo in povratno informacijo trenerja.
- Brezplačni javni tečaji (YouTube embed) z ocenami in komentarji.
- Avtomatsko pridobivanje zdravstvenih podatkov iz Garmin Connect in Health Connect.

---

---

## Model izmenjave veščin

| Komponenta FitLink teme | Implementacija v FitLink |
|---|---|
| **Iskanje uporabnikov po interesih** | treniranci iščejo verificirane trenerje po specializaciji (Strength, Hypertrophy, Mobility, ...) |
| **Izmenjava učnih storitev** | Trener nudi: trening načrte, komentarje na izvedbo, tečaje. Treniranec nudi: podatke o izvajanju, tedenske check-ine, feedback |
| **Sistem zagotavljanja kakovosti** | Verifikacija licence trenerja s strani administratorja, ocene tečajev (1–5 zvezdic), peer review med trenerji |
| **Koledar srečanj** | Načrtovanje video klicev (Zoom) z usklajevanjem terminov med trenerjem in treniraneem |
| **Ocenjevanje izkušenj** | Ocene in komentarji tečajev, povratna informacija trenerja na trening session in tedenski check-in |
| **Javna izmenjava znanja** | Brezplačni tečaji z YouTube videi, dostopni vsem prijavljenim uporabnikom |

---

## Funkcionalnosti

Funkcionalnosti so razvrščene po vlogah znotraj sistema izmenjave veščin: **treniranec** (prejemnik mentorstva), **trener** (ponudnik znanja in mentorstva), **administrator** (skrbnik kakovosti).

### Treniranec

- Registracija, prijava, urejanje profila
- Ustvarjanje lastnih treningov ali sprejemanje od trenerja
- Live tracking treninga s shranjevanjem zgodovine
- Tedenski check-in (slika, teža, opomba)
- Pregled in opravljanje brezplačnih tečajev
- Sinhronizacija zdravstvenih podatkov iz Garmin/Health Connect
- Iskanje in povezovanje s trenerjem

### Trener

- Verifikacija licence ob registraciji
- Vodenje več treniraneev hkrati
- Ustvarjanje in urejanje treningov za posameznega treniranca
- Pregled tedenskih check-inov in komentiranje
- Objavljanje brezplačnih tečajev (YouTube embed)
- Ocenjevanje in komentiranje tečajev drugih trenerjev
- Načrtovanje video klicev s treniranci

### Administrator

- Pregled in potrjevanje licenc trenerjev

---

## Arhitektura

```
+----------------------+         +-----------------------+
|  React Native App    | <-----> |  Firebase Auth        |
|  (Android, JS/TS)    |         |  (login, ID tokens)   |
+----------------------+         +-----------------------+
   |       |        |
   |       |        \---- Garmin Connect API (OAuth 2.0)
   |       \------------- Android Health Connect (lokalni API)
   |
   | HTTPS REST + JWT (Firebase ID Token)
   v
+----------------------+         +-----------------------+
|  Spring Boot Backend | <-----> |  MongoDB              |
|  (Java 21, Maven)    |         |  (Atlas / lokalno)    |
|  REST + WebSocket    |         +-----------------------+
+----------------------+
   |              |
   |              \------> Firebase Cloud Messaging
   |                       (push notifikacije)
   |
   \----> File storage (lokalno / GridFS / S3)
```

---

## Tehnologije

| Plast         | Tehnologija                                                           |
| ------------- | --------------------------------------------------------------------- |
| Mobile        | React Native (bare), TypeScript, React Navigation                     |
| Backend       | Java 21, Spring Boot 4.x, Maven, Spring Security, Spring Data MongoDB |
| Database      | MongoDB 7.x                                                           |
| Auth          | Firebase Authentication (email/password)                              |
| Push          | Firebase Cloud Messaging (FCM)                                        |
| Health data   | Garmin Connect API, Android Health Connect                            |
| Video calls   | Zoom link (MVP)                                                       |
| CI/CD         | GitHub Actions                                                        |
| Verzioniranje | Git + GitHub (Pull Request workflow)                                  |

---

## Struktura repozitorija

```
fitlink/
├── backend/                # Spring Boot REST API
│   ├── src/main/java/si/feri/fitlink/
│   │   ├── auth/           # Firebase token validacija, vloge
│   │   ├── user/           # Profil, nastavitve
│   │   ├── trainer/        # Verifikacija licenc
│   │   ├── coaching/       # Trener-treniranec povezave
│   │   ├── exercise/       # Knjižnica vaj
│   │   ├── workout/        # Templates + dokončani treningi
│   │   ├── checkin/        # Tedenski check-ini
│   │   ├── course/         # Tečaji, ocene, komentarji
│   │   ├── health/         # Garmin/Health Connect sync
│   │   ├── call/           # Video klici (scheduling)
│   │   ├── chat/           # WebSocket sporočila (optional)
│   │   ├── notification/   # FCM, in-app notifikacije
│   │   ├── config/         # Spring konfiguracije (Security, Mongo, Firebase)
│   │   └── common/         # Skupne DTO, exception handler
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── seed/exercises.json    # ~80 osnovnih vaj (kasneje)
│   ├── src/test/java/
│   └── pom.xml
├── mobile/                 # React Native (bare)
│   ├── android/
│   ├── src/
│   │   ├── api/            # axios klient, interceptors
│   │   ├── navigation/     # React Navigation stack-i
│   │   ├── screens/        # vse strani aplikacije
│   │   ├── components/     # skupne UI komponente
│   │   ├── store/          # state management
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types/          # TypeScript interface-i
│   │   ├── theme/          # barve, spacing, typography
│   │   └── constants/
│   ├── App.tsx
│   └── package.json
├── docs/
│   ├── FitLink_PRD.docx     # Produktni načrt
│   ├── api/                 # OpenAPI spec (kasneje)
│   └── architecture/        # diagrami
├── .github/workflows/       # GitHub Actions (kasneje)
├── docker-compose.yml       # MongoDB za lokalni razvoj
└── README.md
```

---

## Začetek razvoja

### Predpogoji

- **Java 21** – `java --version`
- **Maven 3.9+** – `mvn --version`
- **Node.js 22 LTS** + **npm 10+** – `node --version`
- **Android Studio** s Platform SDK 34 (API level 34, Android 14)
- **Docker** in **Docker Compose** (za lokalni MongoDB)
- **Firebase projekt** + `google-services.json` (za mobile) in `firebase-adminsdk.json` (za backend)

### 1. Klon repozitorija

```bash
git clone https://github.com/gubicnino/FitLink.git
cd FitLink
```

### 2. Lokalni MongoDB

```bash
docker compose up -d mongo
```

Privzeto teče na `mongodb://localhost:27017`.

### 3. Backend

```bash
cd backend
cp src/main/resources/application.example.yml src/main/resources/application-local.yml
# uredi MongoDB URI in pot do firebase-adminsdk.json
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Backend bo dosegljiv na `http://localhost:8080`.

### 4. Mobile (Android)

```bash
cd mobile
npm install
# kopiraj google-services.json v mobile/android/app/
npm run android
```

---

## Konfiguracija okolja

### Backend (application-local.yml)

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/fitlink

firebase:
  service-account-path: classpath:firebase-adminsdk.json

storage:
  local-path: ./uploads     # lokalna pot za slike/videe (MVP)

garmin:
  client-id: ${GARMIN_CLIENT_ID:}
  client-secret: ${GARMIN_CLIENT_SECRET:}
  redirect-uri: ${GARMIN_REDIRECT_URI:fitlink://garmin/callback}

server:
  port: 8080
```

### Mobile (.env)

```env
API_BASE_URL=http://10.0.2.2:8080   # za Android emulator
FIREBASE_PROJECT_ID=fitlink-dev
```

> **Opomba:** `10.0.2.2` je naslov, ki ga Android emulator uporablja za dostop do localhost gostiteljskega računalnika.

---

## Build & deploy

### Backend (JAR)

```bash
cd backend
mvn clean package -DskipTests
java -jar target/fitlink-0.1.0.jar
```

### Mobile (APK)

```bash
cd mobile/android
./gradlew assembleRelease
# APK: mobile/android/app/build/outputs/apk/release/app-release.apk
```

### CI/CD

GitHub Actions workflows v `.github/workflows/`:

- `backend-build.yml` – Maven build, unit testi
- `mobile-build.yml` – Gradle assembleDebug, lint
- `ci.yml` – orchestrator, sproži se na PR

---

## API dokumentacija

Po zagonu backend-a:

- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`

Vsi endpoint-i (razen `/auth/*`) zahtevajo `Authorization: Bearer <firebase_id_token>` header.

### Primeri ključnih endpoint-ov

```
POST   /users/me                  # provisioning po prvi prijavi
GET    /coachings/me              # trenutna aktivna povezava
POST   /coachings/requests        # zahteva za coaching
PATCH  /coachings/requests/:id    # accept/reject

GET    /exercises                 # knjižnica vaj
POST   /workouts/templates        # ustvari template
POST   /workouts/sessions         # shrani dokončan trening

POST   /checkins                  # nov tedenski check-in
GET    /checkins/trainee/:id      # za trenerja

GET    /courses                   # seznam tečajev
POST   /courses                   # objava (samo trenerji)
POST   /courses/:id/reviews       # ocena/komentar
```

---

## Razvoj

### Konvencije

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- **Code style:** backend – Google Java Style; mobile – ESLint + Prettier (config v repozitoriju).

---

---

## Skladnost s temo predmeta

| Zahteva teme "Izmenjava veščin" | Naša implementacija |
|---|---|
| Spletna/mobilna platforma za izmenjavo znanj | ✅ Android mobilna aplikacija |
| Sistem matching-a med ponudnikom in iskalcem | ✅ Treniranec išče trenerja, trener sprejme/zavrne zahtevo |
| Mehanizem zagotavljanja kakovosti | ✅ Verifikacija licenc + ocene tečajev + peer review |
| Komunikacija med uporabniki | ✅ Komentarji na treninge, check-ine, tečaje; Zoom video klici; (opcijsko) WebSocket chat |
| Sledenje napredka uporabnikov | ✅ Tedenski check-ini, zgodovina treningov, zdravstveni podatki |
| Javna izmenjava znanja (skupnost) | ✅ Brezplačni tečaji z YouTube videi, dostopni vsem |

---
