# Standardi kodiranja – FitLink

Enoten povzetek standardov kodiranja za celoten projekt FitLink (monorepo). Dokument združuje pravila, ki so razpršena po `README.md` in `CLAUDE.md` datotekah ter konfiguracijah posameznih aplikacij, in jih dopolnjuje s konvencijami, ki se v kodi dejansko uporabljajo. Velja za **backend**, **mobile** in **webapp**.

---

## 1. Skupni standardi (vse aplikacije)

- **Commiti:** [Conventional Commits](https://www.conventionalcommits.org/) – predpone `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` (po potrebi `test:`, `perf:`, `ci:`).
- **Majhne, osredotočene datoteke in funkcije:** ena odgovornost na datoteko/funkcijo; obsežno logiko razbijemo na manjše, poimenovane dele.
- **Validacija na robovih sistema:** vhodnim podatkom (uporabniški vnos, API odgovori) ne zaupamo brez preverjanja.
- **Eksplicitno rokovanje z napakami:** uporabniku prikažemo smiselno sporočilo, internih podrobnosti (stack trace, sistemska sporočila) ne razkrivamo navzven.
- **Organizacija po domenah/funkcijah**, ne po tipu datoteke.

---

## 2. Backend (Java 21 + Spring Boot)

**Arhitektura**
- Paket-na-domeno: `si.feri.fitlink.<domena>` (npr. `auth`, `user`, `coaching`, `workout`, `chat`, `health` …).
- Strogo slojenje znotraj domene: **Controller → Service → Repository**.
- Skupna koda v `common/`, konfiguracija v `config/`.

**Pravila**
- **DTO so ločeni od `@Document` entitet.** DTO živijo v `dto/` podpaketu ali v »holder« razredu (`WorkoutDtos`, `ExerciseDtos`, `ChatDtos`). Kontrolerji **ne vračajo** entitet.
- **Lombok povsod:** `@RequiredArgsConstructor` za konstruktorsko injekcijo (brez field injection), `@Builder` na entitetah, `@Data` na DTO.
- **Avtorizacija:** vloge prek `@PreAuthorize` / method security; avtenticiran uporabnik je dosegljiv kot `AuthPrincipal`.
- **Centralno rokovanje z napakami:** servisi mečejo domenske izjeme (`ResourceNotFoundException` iz `common/exception/`); `GlobalExceptionHandler` jih preslika v HTTP odgovore. Nove tipe izjem dodajamo tam, **brez ad-hoc `ResponseStatusException`**.
- **Push obvestila** gredo prek `common/NotificationService` + `common/FcmPushService`, ne z neposrednimi klici Firebase.

**Slog in poimenovanje**
- Google Java Style, 4-presledčni zamik, en javni tip na datoteko.
- `PascalCase` za razrede/vmesnike/`enum`; `camelCase` za metode, polja in parametre; `SCREAMING_SNAKE_CASE` za konstante in `enum` vrednosti (`Role`, `CoachingStatus`, `VideoCallStatus`).
- Paketi: male črke.

**Testi**
- JUnit 5 + Mockito + AssertJ; enotni testi servisnega sloja (`@ExtendWith(MockitoExtension.class)`, `@Mock` repozitoriji, `@InjectMocks` servis).
- `@DisplayName` s človeku berljivim opisom vedenja; imena metod sledijo vzorcu `metoda_pogoj_pričakovaniRezultat`.
- Testne podatke gradimo z builderji entitet (`User.builder()...`).

---

## 3. Frontend (webapp in mobile – TypeScript + React / React Native)

**Skupno za oba odjemalca**
- **Funkcionalne komponente** v TypeScriptu.
- **Poimenovanje:** `PascalCase` za komponente in tipe/vmesnike, `camelCase` za funkcije, `use`-predpona za hooke, `UPPER_SNAKE_CASE` za konstante.
- **Enoten API-sloj:** ves HTTP teče prek enega Axios primerka (`apiClient.ts`), ki pripne Firebase ID-token; novi endpointi gredo v ustrezen modul po domeni (`workoutApi.ts`, `chatApi.ts`, `checkInApi.ts` …). **Nikoli** ne ustvarjamo drugega Axios primerka.
- **Stanje avtentikacije** beremo prek `AuthContext` / `useAuth`, ne neposredno iz Firebase v komponentah.
- **Styling** prek konstant tem (`colors`, `spacing`, `typography`, `shadows`).
- **Tipna varnost:** izogibamo se `any` – za nezanesljiv vhod uporabimo `unknown` + zožitev ali generike; izvožene funkcije imajo eksplicitne povratne tipe.
- **Brez `console.*`** v produkcijski kodi (uporabimo namenski logger ali odstranimo).
- Ločene definicije deljenih tipov v `types/`.

**Webapp (React 19 + Vite)**
- Routanje z react-router v7: avtentizirane poti ovijemo v `ProtectedRoute`, vlogam omejene dodatno v `RoleRoute` (TRAINER/ADMIN).
- Styling iz `src/theme/`; ikone iz `lucide-react`.
- Preverjanje sprememb: `npm run build` (`tsc -b` + Vite) in `npm run lint` morata uspeti.

**Mobile (React Native)**
- Struktura: `api/`, `components/`, `hooks/`, `navigation/`, `screens/` (po vlogah: `admin/`, `trainer/`, `trainee/`), `services/`, `theme/`, `types/`.
- Styling iz `theme/`; navigacija z React Navigation (spodnji zavihki + skladi po vlogah).

---

## 4. Kje so pravila zapisana (viri v repozitoriju)

| Vir | Kaj določa |
|-----|------------|
| korenski `README.md` → *Konvencije* | commiti; »backend – Google Java Style; mobile – ESLint + Prettier«. |
| korenski `CLAUDE.md` → *Conventions* | commiti; backend Google Java Style + Lombok; frontend/mobile ESLint + Prettier, funkcionalne komponente, poimenovanje; enoten API-sloj. |
| `backend/README.md` → *Konvencije* | slojena arhitektura, `@Service`/`@RestController`, DTO ločeni od entitet, Lombok, `GlobalExceptionHandler`, paketi po domenah. |
| `backend/CLAUDE.md` | slojenje, DTO vs `@Document`, `@PreAuthorize`, izjeme, Lombok, testni standard. |
| `webapp/CLAUDE.md` | `apiClient.ts`, routanje, styling iz `theme/`, `AuthContext`. |
| `mobile/CLAUDE.md` | struktura map, enoten API-sloj. |
| `webapp/eslint.config.js` | ESLint (flat): `js`, `typescript-eslint`, `react-hooks`, `react-refresh`. |
| `mobile/.eslintrc.js` + `mobile/.prettierrc.js` | ESLint `@react-native`; Prettier: `singleQuote`, `trailingComma: 'all'`, `arrowParens: 'avoid'`. |
| `webapp/tsconfig.app.json` / `mobile/tsconfig.json` | TypeScript pravila prevajalnika. |

---