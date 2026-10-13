# Naloga 1: Izbira projekta in popis stanja

**Projekt:** FitLink - platforma za fitnes coaching
**Repozitorij:** https://github.com/gubicnino/FitLink

---

## Kazalo

1. [Pregled projekta](#1-pregled-projekta)
2. [Del A – Namestitev in preverjanje dokumentacije](#2-del-a--namestitev-in-preverjanje-dokumentacije)
3. [Del B – Standardi kodiranja](#3-del-b--standardi-kodiranja)
4. [Del C – Testiranje in zagotavljanje kakovosti](#4-del-c--testiranje-in-zagotavljanje-kakovosti)
5. [Uporaba generativne UI](#5-uporaba-generativne-ui)
6. [Povzetek in prioritete](#6-povzetek-in-prioritete)

---

## 1. Pregled projekta

FitLink je **monorepo** s štirimi neodvisno zaganljivimi aplikacijami:

| Mapa | Tehnologija | Namen | Stanje |
|------|-------------|-------|--------|
| `backend/` | Java 21 + Spring Boot 4 + MongoDB | REST API + WebSocket strežnik | aktivno |
| `webapp/` | React 19 + TypeScript + Vite | nadzorna plošča (admin/trener), gostuje na Vercel | aktivno |
| `mobile/` | React Native 0.85 (bare) | **glavna, dejansko uporabljena** Android aplikacija | aktivno, v produkciji |
| `mobile-app/` | Expo 54 + expo-router | eksperimentalna pretvorba v Expo (Android + iOS) | **zgodnja faza, (še) ni v uporabi** |

Avtentikacija: Firebase (ID token) na vseh odjemalcih; backend preverja token prek Firebase Admin SDK in uveljavlja vloge `TRAINEE` / `TRAINER` / `ADMIN`. Real-time klepet teče prek STOMP/WebSocket na `/ws`.

`mobile/` je aplikacija, za katero velja obstoječa namestitvena dokumentacija in ki se dejansko uporablja; `mobile-app/` je ločen, zgodnji eksperiment s pretvorbo v Expo in v tej fazi (še) ni v produkcijski uporabi. Popis v nadaljevanju se zato osredotoča na `mobile/`; `mobile-app/` je omenjen zgolj informativno, njegova odsotnost iz uporabniške dokumentacije ni obravnavana kot napaka.

---

## 2. Del A – Namestitev in preverjanje dokumentacije

### 2.1 Potek vzpostavitve

Vzpostavitev razvojnega okolja sem preverjal po obstoječi dokumentaciji:
- korenski `README.md` (poglavji *Navodila za razvoj* in *Navodila za namestitev*),
- `README.md` v `backend/`

Zahtevano začetno stanje za lokalni zagon:
1. **MongoDB** – prek `docker compose up mongodb` (ali MongoDB Atlas prek `MONGODB_URI`).
2. **Firebase** – lasten projekt + skrivnosti (`backend/src/main/resources/firebase-adminsdk.json`, `.env` datoteke v odjemalcih). Brez `firebase-adminsdk.json` se backend ne zažene.
3. **Backend** – `./mvnw spring-boot:run`
4. **Odjemalec** – webapp (`npm run dev`, `:5173`) ali mobilna aplikacija.


### 2.2 Najdena neskladja in nejasnosti v dokumentaciji

Oznake resnosti: **VISOKA** (blokira ali zavede namestitev), **SREDNJA** (povzroči zmedo/izgubo časa), **NIZKA** (kozmetično).

| # | Resnost | Lokacija | Neskladje / nejasnost | Predlog popravka |
|---|---------|----------|------------------------|------------------|
| A1 | VISOKA | Root `README.md` → korak 4 (Mobile) | Navodilo za `.env` navaja **`API_BASE_URL=http://10.0.2.2:8080`**, koda v `mobile/src/api/apiClient.ts` pa prek `react-native-config` bere **`API_URL`**. Z napačnim imenom je vrednost prazna → aplikacija ne doseže backenda. **Opomba:** `mobile/README.md`, `mobile/.env.example` in `mobile/CLAUDE.md` imajo pravilno ime (`API_URL`) – gre torej izključno za napako v root README, ne za težavo v dokumentaciji same mobilne aplikacije. | V root README popraviti `API_BASE_URL` → `API_URL` (ali napotiti na `mobile/README.md`). |
| A2 | SREDNJA | `README.md` vs `backend/README.md` vs `backend/CLAUDE.md` | Nedosleden ukaz za zagon backenda: README navaja globalni **`mvn spring-boot:run`**, ostala dokumentacija pa Maven wrapper **`./mvnw`**. Wrapper ne zahteva globalno nameščenega Mavna – zanesljivejši. | Poenotiti na `./mvnw spring-boot:run` povsod. |
| A3 | SREDNJA | vsa navodila | **Ni navodil za različne OS.** Ukazi so v obliki za Unix (`./mvnw`, `chmod +x`, `adb`). Na Windows je wrapper `mvnw.cmd`, `chmod` ne obstaja, projekt pa se dejansko razvija na Windows okolju. | Dodati opombe za Windows/macOS/Linux (npr. `mvnw.cmd` vs `./mvnw`, dodajanje Android `platform-tools` v PATH). |
| A4 | SREDNJA | `README.md` → *Navodila za razvoj* | **Webapp ni opisan** v razvojnih navodilih (le povezava na produkcijsko gostovanje). Manjka `cp .env.example .env` + `VITE_FIREBASE_*` in `npm run dev`. | Dodati razdelek *Webapp* z env in zagonskimi ukazi. |
| A5 | SREDNJA | `README.md` → Firebase | Opisano je samo dodajanje **Android** aplikacije v Firebase. Za webapp je potrebna **Web** aplikacija (`VITE_FIREBASE_*`), za Google prijavo pa **OAuth Web Client ID**. | Dopolniti navodila s Firebase Web app + OAuth odjemalci. |

### 2.3 Vidik različnih operacijskih sistemov (vzpostavitev razvoja)

Navodila so pisana za Unix lupino, brez opomb po OS. Kaj manjka:

- **Windows:** `./mvnw` v PowerShell/cmd ne deluje (treba `.\mvnw.cmd`); README navaja globalni `mvn` namesto wrapperja; druga pot do `adb`/platform-tools (`%LOCALAPPDATA%\Android\Sdk\platform-tools`). Največja pomanjkljivost.
- **macOS / Linux:** ukazi delujejo, a ni navedeno: Docker Desktop (macOS) vs Docker Engine + KVM za emulator (Linux) in različne poti do Android SDK (`~/Library/Android/sdk` vs `~/Android/Sdk`).

---

## 3. Del B – Standardi kodiranja

> Pregled standardov zajema **backend**, **mobile** in **webapp**; Expo različica `mobile-app/` je iz te analize izključena (eksperiment, še ni v uporabi).

### 3.1 Kje so standardi zapisani

Projekt nima enotnega dokumenta s standardi kodiranja; pravila so razpršena po dokumentaciji in konfiguracijskih datotekah. Natančen seznam virov in v njih zapisanih pravil:

| Vir (datoteka) | Zapisani standardi / pravila |
|----------------|-------------------------------|
| korenski `README.md` → *Konvencije* | Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`); »Code style: backend – Google Java Style; mobile – ESLint + Prettier (config v repozitoriju)«. |
| korenski `CLAUDE.md` → *Conventions* | Conventional Commits; backend = Google Java Style + Lombok (`@Data`, `@RequiredArgsConstructor`, `@Builder`); frontend/mobile = ESLint + Prettier, funkcionalne komponente v TS, `PascalCase` komponente / `camelCase` funkcije; enoten API-sloj (`apiClient.ts` + moduli po domenah). |
| `backend/README.md` → *Konvencije* | Slojena arhitektura Repository → Service → Controller; `@Service` / `@RestController`; DTO ločeni od entitet; Lombok `@Data`, `@RequiredArgsConstructor`; napake centralno v `GlobalExceptionHandler`; paketi po domenah (DDD). |
| `backend/CLAUDE.md` | Paket-na-domeno + strogo slojenje; DTO ločeni od `@Document`, kontrolerji ne vračajo entitet; vloge prek `@PreAuthorize`; napake prek `ResourceNotFoundException` + `GlobalExceptionHandler` (brez ad-hoc `ResponseStatusException`); Lombok povsod; **testni standard**: `@ExtendWith(MockitoExtension)`, AssertJ, `@DisplayName`, poimenovanje `metoda_pogoj_pričakovaniRezultat`. |
| `webapp/CLAUDE.md` | Ves HTTP prek `apiClient.ts`; routanje react-router v7 (`ProtectedRoute` / `RoleRoute`); styling iz `src/theme/`; stanje avtentikacije prek `AuthContext`. |
| `mobile/CLAUDE.md` | Struktura map (`api/`, `components/`, `hooks/`, `navigation/`, `screens/`, `services/`, `theme/`, `types/`); enoten API-sloj (`apiClient.ts` + moduli po domenah). |

### 3.2 Standardi, ki se uporabljajo, čeprav niso (eksplicitno) zapisani

Naslednja pravila se v kodi dosledno uporabljajo, čeprav jih nobena dokumentacija izrecno ne določa:

- **Backend (Java):** 4-presledčni zamik; en javni tip na datoteko; DTO »holder« razredi (`WorkoutDtos`, `ExerciseDtos`, `ChatDtos`); `enum` v `SCREAMING_SNAKE_CASE` (`Role`, `CoachingStatus`, `VideoCallStatus`); konstruktorska injekcija (prek Lombok `@RequiredArgsConstructor`, ne field injection); avtenticiran uporabnik kot `AuthPrincipal`.
- **Frontend (webapp + mobile):** enak vzorec API-modulov po domenah (`workoutApi.ts`, `chatApi.ts`, `checkInApi.ts`, …) v obeh odjemalcih; ločene definicije tipov v `types/`; theme konstante (`colors.ts`, `spacing.ts`, `typography.ts`, `shadows.ts`) kopirane med webapp in mobile; `use`-predpona za hooke; `PascalCase` komponente / `camelCase` funkcije.

### 3.3 Najdena odstopanja od standardov

| # | Resnost | Lokacija | Odstopanje | Standard, ki je kršen |
|---|---------|----------|------------|------------------------|
| B1 | SREDNJA | **backend** `testing/HealthController.java` | Produkcijski kontroler v paketu `testing` (ne po domeni); polno kvalificiran `org.bson.Document` namesto importa; `catch (Exception e)` vrača `e.getMessage()` odjemalcu (razkritje notranje napake). | Paketi po domenah (`backend/README.md`, `backend/CLAUDE.md`); varno rokovanje z napakami. → **Popravljeno (3.5).** |


### 3.4 Definirani standardi ekipe

Ker standardi nikjer niso zbrani v enem dokumentu – pravila so razpršena po `README.md` in `CLAUDE.md` datotekah ter konfiguracijah posameznih aplikacij – sem jih formaliziral v samostojno datoteko [`docs/STANDARDI-KODIRANJA.md`](./STANDARDI-KODIRANJA.md), ki združuje standarde celotnega projekta. Spodaj je povzetek ključnih pravil:

### 3.5 Popravljena datoteka (zahtevano z nalogo)

Skladno z **zapisanima** praviloma »**paketi po domenah**« in »**varno rokovanje z napakami**« (`backend/README.md`, `backend/CLAUDE.md`) sem popravil **`HealthController`** (prej `testing/HealthController.java`):

- **premaknjen iz paketa `testing`** (ni domena) v navzkrižni paket **`common/`** (`si.feri.fitlink.common`) – skladno s pravilom »paketi po domenah / skupna koda v `common/`«;
- **polno kvalificiran `org.bson.Document` zamenjan z importom** (`import org.bson.Document;`);
- **odpravljeno razkritje notranje napake:** `catch` ne vrača več `e.getMessage()` odjemalcu, temveč napako zabeleži strežniško (`@Slf4j` log) in vrne splošen odgovor `503 "MongoDB unavailable"` (prej `200` z vsebino izjeme).


### 3.6 Datoteke, ki ne upoštevajo standardov

Spodaj so navedene datoteke, ki odstopajo od **dejansko zapisanih** standardov projekta (3.1). Pregled zajema **backend**, **mobile** in **webapp**.

**Backend** – skladnost je visoka; izstopala je ena datoteka, ki je zdaj **popravljena**:
- `testing/HealthController.java` → premaknjen v `common/HealthController.java`; odpravljene kršitve pravila »paketi po domenah« (`backend/README.md`, `backend/CLAUDE.md`) in razkritje notranje napake. **Popravljeno (3.5).**

**Webapp in mobile** – odstopanj od **zapisanih** standardov ni. V kodi se sicer pojavljata `console.*` (webapp 22, mobile 91 pojavitev) in `any` (mobile 66 pojavitev), vendar teh dveh pravil nobena projektna dokumentacija izrecno ne določa – zaznava ju le ESLint, zato nista obravnavana kot odstopanje od zapisanih standardov.

---

## 4. Del C – Testiranje in zagotavljanje kakovosti

### 4.1 Prisotne aktivnosti

| Aktivnost | Vrsta | Stanje | Pokriti del rešitve | Orodja / ogrodja |
|-----------|-------|--------|----------------------|------------------|
| Enotni testi backend | Unit testi | **Delno.** 7 testnih razredov, servisni sloj; brez Spring konteksta/embedded Mongo | `auth` (FirebaseAuthFilter), `user`, `coaching`, `checkin`, `videocall`, `common` (NotificationService, GlobalExceptionHandler) | JUnit 5, Mockito, AssertJ |
| CI – Pull Request | Avtomatizacija (CI) | **Aktivno** | backend testi + mobile lint | GitHub Actions (`ci.yml`) |
| CI – push na `main` (backend) | Avtomatizacija (CI) | **Aktivno** | backend testi + build JAR (z MongoDB servisom in Firebase credentials iz Secrets) | GitHub Actions (`backend-deploy.yml`) |
| CI/CD – Android APK | Build/Release | **Aktivno**, za `mobile/` (aktivno uporabljena aplikacija) | podpisan release APK → GitHub Release | GitHub Actions (`android.yml`), Gradle |
| Linting webapp/mobile-app | Statična analiza | **Aktivno lokalno** (ni v CI) | webapp, mobile-app | ESLint (flat config), `tsc -b` (webapp) |
| Deploy webapp | Dostava | **Aktivno** (izven GH Actions) | webapp | Vercel (SPA rewrites prek `vercel.json`) |
| Dokumentiranje API | Zagotavljanje kakovosti (specifikacija) | **Aktivno** | backend REST | springdoc OpenAPI / Swagger UI |

### 4.2 Pomanjkljivosti

- **Ni enotnih testov za frontend**; `mobile` (aktivno uporabljena aplikacija) ima le privzeti starter `App.test.tsx`, brez dejanske pokritosti.
- **Ni integracijskih testov** (backend namenoma brez `@SpringBootTest`) in **ni E2E testov** (npr. Playwright za webapp, Detox/Maestro za `mobile`).
- **Nepokrite backend domene:** `workout`, `course`, `exercise`, `chat`, `health`, `trainerapplication`, `notification`.
- **Prag pokritosti ni uveljavljen** – JaCoCo le poroča, CI ne blokira ob padcu pokritosti (cilj 80 % ni vsiljen).
- **Mobile lint v CI ima `continue-on-error: true`** → kršitve lint-a v `mobile/` nikoli ne zrušijo gradnje.
- **UI pri testiranju ni evidentirana** – ni sledi o generiranju/preverjanju testov z UI orodji.


### 4.3 Priporočila (prednostni vrstni red)

1. V CI dodati webapp `npm run build` + `npm run lint` (odstraniti `continue-on-error` pri mobile lintu v `ci.yml`).
2. Dodati **integracijske teste za backend** (Testcontainers + MongoDB, `@SpringBootTest` / `@WebMvcTest` / `@DataMongoTest`) za poti, ki jih unit test
i ne pokrijejo: varnostna veriga (`FirebaseAuthFilter`), dejanske Mongo poizvedbe, (de)serializacija kontrolerjev in preslikava napak v `GlobalExceptio
nHandler`.
3. Vzpostaviti E2E za ključne tokove (prijava, live trening, klepet) – Playwright (webapp).
4. Razširiti backend enotne teste na nepokrite domene;

---

## 5. Uporaba generativne UI

Pri tej nalogi sem uporabil agenta **Claude Code**:

- **Pregled repozitorija:**  (branje `README`, `CLAUDE.md`, `pom.xml`, `package.json`, CI workflowov, izvorne kode in testov), prepoznava neskladij v dokumentaciji in povzetek standardov
- **Formatiranje in pisanje md datoteke:** uporabil za pomoč pri lepem oblikovanju md datoteke in pri tvorjenju povedi
---
