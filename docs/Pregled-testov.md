# Pregled in popravek obstoječih unit testov (backend)

**Projekt:** FitLink – backend (`backend/src/test/java/si/feri/fitlink/`)
**Orodja:** JUnit 5, Mockito, AssertJ, Spring MockMvc, JaCoCo

---

## Kazalo

1. [Namen in pristop](#1-namen-in-pristop)
2. [Povzetek rezultatov](#2-povzetek-rezultatov)
3. [Ugotovitve po testnih razredih](#3-ugotovitve-po-testnih-razredih)
4. [Napake v produkcijski kodi, ki so jih odkrili testi](#4-napake-v-produkcijski-kodi-ki-so-jih-odkrili-testi)
5. [Odprta vprašanja in znana tveganja](#5-odprta-vprašanja-in-znana-tveganja)

---

## 1. Namen in pristop

Cilj je bil najti pomanjkljive teste in jih popraviti ali dopolniti. Iskali smo predvsem teste, ki:

- **nič ne preverjajo**: uspejo tudi, če kodo pokvarimo,
- **prepisujejo trenutno obnašanje kode**: pričakovana vrednost je vzeta iz implementacije, ne iz zahteve,
- **se podvajajo**: več testov pokriva isto vejo kode,
- **so preveč vezani na implementacijo** ali pa preveč ohlapni (npr. `any()` povsod).

Pri dopolnjevanju je veljalo pravilo, da **testi opisujejo pričakovano obnašanje, ne obstoječe kode**. Kjer se koda od pričakovanega obnašanja razlikuje, test pade. Teh testov namenoma nismo prilagodili, da bi uspeli, ker kažejo na napako v kodi (glej [poglavje 4](#4-napake-v-produkcijski-kodi-ki-so-jih-odkrili-testi)). Produkcijske kode pri tem pregledu nismo spreminjali.

---

## 2. Povzetek rezultatov

| Testni razred | Testov prej | Testov zdaj | Padejo | Ocena prej |
|---|---|---|---|---|
| `FirebaseAuthFilterTest` | 6 | 8 | 0 | dobro, en test ne preverja ničesar |
| `CheckInServiceTest` | 12 | 19 | 0 | šibke trditve, manjka pokritost |
| `CoachingServiceTest` | 17 | 27 | 6 | preohlapni stubi, manjkajo prehodi stanj |
| `NotificationServiceTest` | 11 | 15 | 1 | zavajajoče ime testa, nepreverjeni podatki |
| `GlobalExceptionHandlerTest` | 4 | 8 | 3 | pokriti samo primeri, ki delujejo |
| `UserServiceTest` | 8 | 11 | 0 | v redu, manjše pomanjkljivosti |
| `VideoCallServiceTest` | 22 | 42 | 1 | najboljši, a z dvema »praznima« trditvama |
| **Skupaj** | **80** | **130** | **11** | |

Pred pregledom je bilo uspešnih vseh 80 testov. Po pregledu jih je uspešnih 119, 11 pa jih pade. Vseh 11 padcev izvira iz **6 dejanskih napak v produkcijski kodi**.

Velik del rasti števila testov prinašajo parametrizirani testi (`@ParameterizedTest` + `@EnumSource`), ki en primer izvedejo za vsa stanja enuma.

---

## 3. Ugotovitve po testnih razredih

### 3.1 `FirebaseAuthFilterTest`

| Test | Težava | Popravek |
|---|---|---|
| `invalidToken_clearsContext` | **Ne preverja ničesar.** Pred klicem filtra je `SecurityContext` že prazen, zato bi test uspel tudi, če bi iz filtra odstranili `SecurityContextHolder.clearContext()`. | Test zdaj najprej nastavi obstoječo (zastarelo) avtentikacijo z vlogo ADMIN in nato preveri, da jo filter pri neveljavnem žetonu počisti. Preveri še, da se baza ne kliče. |
| `nonBearer_ignored` | Ne preveri, da se zahteva nadaljuje po verigi filtrov. | Dodano `chain.getRequest() == req`. |
| `validToken_noClaim_fallsBackToDb` | Uporablja vlogo TRAINEE, ki je privzeta, zato ne loči med »prebrano iz baze« in »privzeto«. | Uporabljena vloga ADMIN, ki je lahko prišla samo iz baze. |
| *(manjkalo)* | Obrezovanje žetona (`"Bearer   tok  "`). | Nov test `bearerToken_isTrimmed`. |
| *(manjkalo)* | Uporabnik obstaja v bazi, a nima vloge. | Nov test `validToken_noClaim_userWithoutRole_emptyAuthorities`. |

### 3.2 `CheckInServiceTest`

| Test | Težava | Popravek |
|---|---|---|
| `submitCheckIn_limitsPhotoUrls` | Preverjal je le `hasSize(5)`, ne pa *katerih* 5 slik ostane in v kakšnem vrstnem redu. Test bi uspel tudi, če bi koda obdržala zadnjih 5 ali jih premešala. | `containsExactly("/1.jpg", …, "/5.jpg")` in preverjanje naslovne slike. |
| `submitCheckIn_createsNew`, `deleteCheckIn_ok`, `addTrainerComment_ok` | Noben test ni preverjal, da se spremembe shranijo (`save`). Preverjali so le objekt v pomnilniku. | Dodano `verify(coachingRepo).save(...)`. Odstranjeni so nepotrebni stubi `save`. |
| `submitCheckIn_createsNew` | Ni preverjal `start` (začetek dneva po UTC), `id` ali `deletedByUser`. | Dodane trditve. |
| Negativni primeri | Ni bilo preverjeno, da se ob napaki nič ne shrani. | Dodano `verify(..., never()).save(any())`. |
| *(manjkalo)* | `getMyCheckIns`: združevanje čez več sodelovanj, skrivanje izbrisanih, razvrščanje od najnovejšega, `null` na koncu. | Nov test `getMyCheckIns_filtersAndSorts`. |
| *(manjkalo)* | Izbrisan današnji check-in ne sme biti vrnjen kot »trenutni«. | Nov test `getCurrent_deleted_throws`. |
| *(manjkalo)* | Check-in prejšnjega dne se ne sme prepisati. | Nov test `submitCheckIn_previousDayIsKept`. |
| *(manjkalo)* | Več kot 5 naloženih slik in datoteka, ki ni slika, morata biti zavrnjeni. | Nova testa `tooManyUploadedPhotos_throws` in `nonImageUpload_throws`. |
| *(manjkalo)* | Starejši način s posamičnim `photoUrl` mora napolniti tudi seznam. | Nov test `singlePhotoUrl_fillsList`. |
| *(manjkalo)* | Komentar na neobstoječe sodelovanje. | Nov test `addTrainerComment_missingCoaching_throws`. |

### 3.3 `CoachingServiceTest`

| Test | Težava | Popravek |
|---|---|---|
| `requestCoaching_createsAndNotifies`, `requestCoaching_duplicate_throws` | **Preveč ohlapen stub**: `findByTraineeIdAndTrainerIdAndStatusIn(any(), any(), any())`. Test bi uspel tudi, če bi koda iskala napačne statuse (npr. samo ACTIVE) ali napačnega trenerja. | Stub z natančnimi argumenti `(TRAINEE_ID, TRAINER_ID, [PENDING, ACTIVE])`. Test za podvojeno zahtevo je parametriziran za PENDING in ACTIVE. |
| `buildCalendar_countsCheckInInWindow`, `buildCalendar_countsWeightLog` | Preverjala sta le **vsoto čez vseh 15 dni**, ne pa, ali vnos pade na pravi dan. Test bi uspel tudi, če bi koda vnos pripisala napačnemu datumu. | Preverja se vrstica za današnji dan (`TODAY_INDEX = 7`) in hkrati, da je vsota 1. |
| `buildCalendar_windowSize` | Preverjal je le `hasSize(15)`, ne pa datumov. | Preverja, da gre za 15 zaporednih datumov od danes − 7 do danes + 7 in da so vsi števci 0. |
| `buildCalendar_flagsOverdue` | Ni preverjal, da se star check-in (30 dni) **ne šteje** v koledar. | Dodano preverjanje, da je vsota check-inov 0. |
| `rejectCoaching_ok` | Ni preverjal shranjevanja in tega, da se ne sproži nič od sprejema (obvestilo, pogovor). | Dodani `verify`. |
| `acceptCoaching_conversationFailure_doesNotRollback` | Ni preverjal, da se ob napaki pri pogovoru sodelovanje vseeno shrani in obvestilo pošlje. | Dodana `verify(save)` in `verify(notifyCoachingAccepted)`. |
| Negativni primeri (`wrongTrainer`, `byStranger`) | Ni bilo preverjeno, da se nič ne shrani in stanje ostane nespremenjeno. | Dodano. |
| *(manjkalo)* | **Prehodi stanj**: sprejeti ali zavrniti je mogoče le zahtevo v stanju PENDING. | Nova parametrizirana testa `acceptCoaching_notPending_throws` in `rejectCoaching_notPending_throws`, **ki padeta** (napaki 1 in 2). |
| *(manjkalo)* | Varovanec brez check-ina je zamudnik; nedavni check-in ni zamuda; fallback ime »Client«; check-in in tehtanje istega dne štejeta kot ena aktivna stranka; staro tehtanje se ne šteje. | Pet novih testov za koledar. |

`isTrainerOfTrainee_*`: stub z `List.of(ACTIVE)` je vezan na obliko poizvedbe, kar je tu sprejemljivo, saj prav to določa pravilo »PENDING ne daje dostopa«. Test smo ohranili, popravili smo le opis.

### 3.4 `NotificationServiceTest`

| Test | Težava | Popravek |
|---|---|---|
| `notifyCoachingRequest_fallbackName` | **Zavajajoče ime.** Opis trdi »trainee has no display name«, stub pa vrne `Optional.empty()`, torej uporabnik **ne obstaja**. Primer »uporabnik obstaja, a nima imena« ni bil nikoli testiran. | Preimenovan v `unknownTrainee_fallbackName`. Dodan nov test `blankName_fallbackName`. |
| Pomožna metoda `assertions(data, …, callId)` | Pri `null` argumentu je preverjanje **tiho preskočila**, ime metode pa ne pove, kaj preverja. | Odstranjena. Vsak test zdaj z `containsExactlyInAnyOrderEntriesOf` preveri celoten zemljevid podatkov. |
| `notifyCoachingRequest_usesTraineeName`, `notifyCoachingAccepted_usesTrainerName` | Podatki za deep-link (`route`, `type`, `coachingId`) niso bili preverjeni (`anyMap()`), čeprav se mobilna aplikacija nanje zanaša pri navigaciji. | Zajeti z `ArgumentCaptor` in preverjeni. |
| *(manjkalo)* | Fallback »Your trainer«, prazen predogled sporočila, `null` conversationId. | Novi testi. |
| *(manjkalo)* | Ime pošiljatelja iz samih presledkov naj se obravnava kot manjkajoče. | Nov test `notifyChatMessage_blankFallback`, **ki pade** (napaka 7). |

### 3.5 `GlobalExceptionHandlerTest`

| Test | Težava | Popravek |
|---|---|---|
| `unexpected_returns500WithSafeMessage` | Opis obljublja »no stack leak«, test pa preveri le polje `message`. Notranje podrobnosti bi se lahko pojavile v drugem polju. | Dodano preverjanje, da telo odgovora ne vsebuje `"internal secret detail"` niti `"RuntimeException"`. |
| `validationFails_returns400WithFieldErrors` | `.exists()` sprejme tudi prazen niz. | `isNotEmpty()` in preverjanje, da sta napaki točno 2. |
| **Celoten razred** | Pokriti so bili **samo primeri, ki že delujejo**: 404, 400 in 500. Izjeme, ki jih servisi dejansko mečejo (`AccessDeniedException`, `IllegalStateException`), niso bile pokrite. | Novi testi za 403, 409, neveljaven JSON in veljavno telo. **Trije padejo** (napake 3, 4 in 5). |

### 3.6 `UserServiceTest`

| Test | Težava | Popravek |
|---|---|---|
| `setFcmToken_stores`, `clearFcmToken_nulls`, `updateProfile_setsProfile` | Shranjevanje je bilo preverjeno le posredno, prek strogih Mockito stubov. Iz testa ni razvidno, da je shranjevanje bistvo testa. | Eksplicitni `verify(userRepo).save(user)`. |
| `clearFcmToken_nulls` | Koda ob odjavi počisti **tudi** `expoPushToken`, kar ni bilo preverjeno. Po prehodu na Expo je to pomembnejši žeton. | Preimenovano v `clearFcmToken_clearsAllPushTokens`, dodana trditev. |
| `findOrCreateUser_existing_returnsIt` | Ni preverjal, da podatki iz žetona **ne prepišejo** obstoječega uporabnika, kar je pomembno zlasti za vlogo. | Obstoječi uporabnik je TRAINER z drugim e-naslovom. Preverjeno je, da ostane nespremenjen. |
| `getTrainers_delegates` | Skoraj tavtološki test: vrne, kar vrne mock. | Ohranjen, ker preverja filter po vlogi TRAINER. Preimenovan v `getTrainers_queriesTrainerRole`. |
| *(manjkalo)* | `setExpoPushToken`, neznan uporabnik pri `setFcmToken` in `updateProfile`. | Novi testi. |

### 3.7 `VideoCallServiceTest`

| Test | Težava | Popravek |
|---|---|---|
| `sweep_completesOldAccepted` | **Ne preverja tega, kar trdi.** Opis pravi »older than 2 hours«, a stub `findByStatusInAndScheduledForBefore(…, any())` vrne klic ne glede na mejo. Test bi uspel tudi, če bi bila meja 0 minut ali 10 dni. | `ArgumentCaptor<Instant>` zajame mejo in preveri, da je ≈ now − 2 h (±5 s). |
| `sweep_expiresPastPending` | Enako za mejo pri PENDING klicih. Ni preverjeno sistemsko sporočilo »expired«. | Zajeta meja (≈ now) in preverjeno sporočilo. |
| `accept_alreadyAccepted_throws`, `accept_expired_throws` | **Podvajanje.** Oba testirata isto vejo (`status != PENDING`), ostalih 4 stanj pa ne pokriva noben test. | Zamenjana z enim parametriziranim testom čez vseh 6 stanj razen PENDING. Enako za `decline` in `cancel`. |
| `cancel_pending_byTrainer_ok`, `cancel_live_ok` | Podvajanje. | Združena v parametriziran test za PENDING in LIVE. |
| `schedule_instant_createsLiveCall` | URL je preverjen le s `startsWith("…/fitlink-")`. Čas začetka in identiteta klica nista preverjena. | Regex za celoten URL (`fitlink-coaching1-<uuid>`), `scheduledFor` je »zdaj«, ID v obvestilu je točen. |
| `decline_truncatesLongReason` | Niz samih `x` ne pokaže, *kateri* del se obdrži. Meja točno 280 znakov ni bila testirana. | Test z natanko 280 znaki (ostane cel) in z 280 + `"TAIL"` (rep se odreže). |
| Negativni primeri | Ni bilo preverjeno, da se nič ne shrani. | Dodano `verify(..., never()).save(any())`. |
| Neuporabljeni uvozi | `times` in `anyBoolean` sta bila uvožena, a neuporabljena. | `times` odstranjen; `anyBoolean` se zdaj uporablja. |
| *(manjkalo)* | Sistemsko sporočilo v chatu in dogodek `ChatMessageSentEvent` za oba udeleženca. | Nov test `schedule_emitsSystemMessage`. |
| *(manjkalo)* | Napaka pri shranjevanju sporočila ne sme preprečiti klica. | Nov test `schedule_messageFailure_doesNotBreakScheduling`. |
| *(manjkalo)* | `decline` s strani trenerja, `accept` neobstoječega klica, `windowForUser` (odstranjevanje dvojnikov). | Novi testi. |
| *(manjkalo)* | `listForConversation`: oseba, ki ni udeleženec pogovora, ne sme videti klicev. | Nov test `listForConversation_stranger_throws`, **ki pade** (napaka 6). |

---

## 4. Napake v produkcijski kodi, ki so jih odkrili testi

Spodnji testi padejo, ker koda ne deluje, kot bi morala. Ostanejo rdeči, dokler napake ne odpravimo v kodi.

| # | Napaka | Datoteka | Posledica | Test |
|---|---|---|---|---|
| 1 | `acceptCoaching` ne preveri, da je sodelovanje v stanju PENDING. | `coaching/CoachingService.java` | Trener lahko ponovno aktivira zavrnjeno ali končano sodelovanje. | `acceptCoaching_notPending_throws` (×3) |
| 2 | `rejectCoaching` ne preveri, da je sodelovanje v stanju PENDING. | `coaching/CoachingService.java` | Trener lahko »zavrne« že aktivno sodelovanje. | `rejectCoaching_notPending_throws` (×3) |
| 3 | Ni handlerja za `AccessDeniedException`, zato jo ujame splošni `Exception` handler. | `common/exception/GlobalExceptionHandler.java` | Vsi odgovori »Not your …« vrnejo **500** namesto **403**. | `accessDenied_returns403` |
| 4 | Ni handlerja za `IllegalStateException`. | isto | Poslovni konflikti (npr. podvojena zahteva) vrnejo **500** namesto **409**. | `illegalState_returns409` |
| 5 | Splošni handler ujame tudi `HttpMessageNotReadableException`. | isto | Neveljaven JSON vrne **500** namesto **400**. | `malformedJson_returns400` |
| 6 | `listForConversation(conversationId, userId)` ne uporabi `userId`. | `videocall/VideoCallService.java` | **Varnostna luknja (IDOR):** vsak prijavljen uporabnik lahko prebere klice in Jitsi povezave katerega koli pogovora. | `listForConversation_stranger_throws` |
| 7 | `notifyChatMessage` obravnava kot manjkajoče le ime `null`, ne pa imena iz samih presledkov. | `common/NotificationService.java` | Potisno obvestilo s praznim naslovom. Drugje v istem razredu (`displayNameOrFallback`) se tak primer že obravnava pravilno. | `notifyChatMessage_blankFallback` |

Napake 3, 4 in 5 imajo skupen vzrok, zato je napak 6, testov, ki padejo, pa 11.

---

## 5. Odprta vprašanja in znana tveganja

Za spodnje točke testov nismo napisali, ker pričakovano obnašanje ni nedvoumno. Potrebna je odločitev.

- **`VideoCallService.schedule` nima zaščite po vlogi.** Preveri le, da je klicatelj udeleženec pogovora. Tudi varovanec lahko razpiše klic in se zapiše kot `trainerId`.
- **`cancel` ne dovoli preklica sprejetega (ACCEPTED) klica.** Trener ne more odpovedati že potrjenega termina, kar je verjetno napaka.
- **`getCurrentWeekCheckInForCurrentUser`** vrne *današnji* check-in, ne tedenskega. Ime metode in obnašanje se ne ujemata.
- **Odvisnost od sistemske ure.** Testi za check-in in koledar sami izračunajo »danes«, enako stori tudi servis. Če test teče točno ob polnoči (UTC oz. lokalni čas), lahko občasno pade. Trajna rešitev je vstavitev `java.time.Clock` v servise.
- **Ni integracijskih testov.** Vsi testi so izolirani unit testi z mocki. Nastavitev varnosti (`SecurityConfig`, `@PreAuthorize`), Mongo poizvedbe in celotna HTTP pot niso testirani. Zato napake 3–5 brez ciljno napisanega testa niso bile vidne.
