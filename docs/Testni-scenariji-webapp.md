# Funkcionalno testiranje – spletna aplikacija FitLink (webapp)

**Projekt:** FitLink – nadzorna plošča za trenerje in administratorje (`webapp/`)
**Standard:** ISO/IEC/IEEE 29119-3:2021 – *Software testing – Part 3: Test documentation*
**Vrsta testiranja:** funkcionalno, ročno, črna škatla (*black-box*)
**Avtor:** Nino Gubič
**Verzija dokumenta:** 1.1 (specifikacija + rezultati izvedbe z dne 23. 10. 2026)

---

## Kazalo

1. [Uvod](#1-uvod)
2. [Funkcionalnosti v obsegu testiranja](#2-funkcionalnosti-v-obsegu-testiranja)
3. [Seznam testnih scenarijev in odgovornosti](#3-seznam-testnih-scenarijev-in-odgovornosti)
4. [Testno okolje in testni podatki](#4-testno-okolje-in-testni-podatki)
5. [Specifikacije testnih primerov](#5-specifikacije-testnih-primerov)
   - [TS-01 Prijava in usmerjanje glede na vlogo](#ts-01-prijava-in-usmerjanje-glede-na-vlogo)
   - [TS-02 Obravnava prijave trenerja](#ts-02-obravnava-prijave-trenerja)
   - [TS-03 Ustvarjanje predloge treninga za stranko](#ts-03-ustvarjanje-predloge-treninga-za-stranko)
6. [Dnevnik izvedbe testov](#6-dnevnik-izvedbe-testov)
7. [Poročila o incidentih](#7-poročila-o-incidentih)
8. [Poročilo o zaključku testiranja](#8-poročilo-o-zaključku-testiranja)

---

## 1. Uvod

### 1.1 Namen

Dokument vsebuje specifikacije, dnevnik izvedbe in poročilo za tri funkcionalne testne scenarije spletne aplikacije FitLink. Struktura sledi dokumentom dinamičnega testiranja iz standarda ISO/IEC/IEEE 29119-3:2021:

| Dokument po 29119-3 | Poglavje v tem dokumentu |
|---|---|
| Test Design Specification (testni pogoji) | 2 |
| Test Case Specification | 5 |
| Test Procedure Specification | 5 (koraki znotraj vsakega primera) |
| Test Data / Test Environment Requirements | 4 |
| Test Execution Log | 6 |
| Test Incident Report | 7 |
| Test Completion Report | 8 |

### 1.2 Obseg

**V obsegu:** prijava in avtorizacija po vlogah, obravnava prijav trenerjev (ADMIN), ustvarjanje predlog treninga (TRAINER).

**Izven obsega:** mobilna aplikacija, klepet v realnem času (WebSocket), zmogljivostno in varnostno testiranje, testiranje zaledja neposredno prek API-ja.

### 1.3 Reference

- ISO/IEC/IEEE 29119-3:2021, IEEE Xplore
- `webapp/CLAUDE.md` – arhitektura spletne aplikacije
- `docs/Pregled-testov.md` – pregled unit testov zaledja

---

## 2. Funkcionalnosti v obsegu testiranja

Obstoječa dokumentacija ne opisuje funkcionalnosti spletne aplikacije, zato so te obnovljene iz izvorne kode.

| ID | Funkcionalnost | Vloga | Lokacija v kodi | Testni pogoji |
|---|---|---|---|---|
| F-01 | Prijava z e-pošto in geslom (Firebase + preverjanje v zaledju) | vse | `src/pages/LoginPage.tsx` | uspešna prijava, napačno geslo |
| F-02 | Usmerjanje in omejitev dostopa po vlogah | vse | `src/components/RoleRoute.tsx`, `src/App.tsx` | pravilna začetna stran, zavrnitev tuje strani, neprijavljen uporabnik |
| F-03 | Pregled, odobritev in zavrnitev prijav trenerjev | ADMIN | `src/pages/admin/AdminApplicationDetailPage.tsx` | prikaz certifikata, validacija razloga, odobritev, zavrnitev |
| F-04 | Ustvarjanje predloge treninga za stranko | TRAINER | `src/pages/trainer/templates/TemplateEditorModal.tsx`, `src/pages/trainer/tabs/WorkoutsTab.tsx` | validacija imena, vaj in setov, uspešno shranjevanje |

---

## 3. Seznam testnih scenarijev in odgovornosti

| ID | Naziv testnega scenarija | Funkcionalnost | Prioriteta | Odgovorna oseba |
|---|---|---|---|---|
| TS-01 | Prijava in usmerjanje glede na vlogo | F-01, F-02 | Visoka | Nino Gubič |
| TS-02 | Obravnava prijave trenerja | F-03 | Visoka | Nino Gubič |
| TS-03 | Ustvarjanje predloge treninga za stranko | F-04 | Srednja | Nino Gubič |
---

## 4. Testno okolje in testni podatki

### 4.1 Testno okolje

| Postavka | Vrednost |
|---|---|
| Aplikacija | webapp (React + Vite), lokalni razvojni strežnik, zagnan z `npm run dev` v mapi `webapp/` – `http://localhost:5173` |
| Zaledje | Spring Boot, Docker vsebnik `backend` (Docker Compose) – `http://localhost:8080` |
| Baza | MongoDB 7, Docker vsebnik `mongodb` (Docker Compose) – `localhost:27017`, baza `fitlink` |
| Zagon okolja | 1. `docker compose up -d --build` v korenski mapi projekta (hkrati zažene `backend` in `mongodb`)<br>2. `npm run seed` v mapi `scripts/seed-test-data/` (pripravi testne podatke iz 4.2)<br>3. `npm run dev` v mapi `webapp/` (konfiguracija iz `webapp/.env.local`) |
| Commit / verzija | `3257d05` (veja `main`) |
| Brskalnik in verzija | Google Chrome 155 (izoliran profil, brez razširitev in shranjenih sej) |
| Operacijski sistem | Windows 11 Home 10.0.26300 |
| Dokazi | posnetki zaslona v mapi [`docs/testing/testing-scenarios/`](testing/testing-scenarios/) – ime datoteke: `<scenarij>-K<korak>-<opis>.png` |

### 4.2 Testni podatki

Podatke TD-01 do TD-05 pripravi skripta `scripts/seed-test-data/seed.mjs`. Ob vsakem zagonu jih ponastavi v začetno stanje, zato jo je treba zagnati **pred vsako izvedbo testov** (TS-02 porabi obe prijavi, TS-03 ustvari predlogo). Vsi testni računi imajo isto geslo `FitLinkTest!2026` (privzeta vrednost `SEED_PASSWORD` v skripti). Računi obstajajo samo v razvojnem Firebase projektu `fitlink-dev-847d0` in lokalni bazi.

| ID | Podatek | Vrednost (e-pošta / geslo) | Opomba |
|---|---|---|---|
| TD-01 | Račun trenerja | `trener.test@fitlink.test` / `FitLinkTest!2026` (Test Trener) | vloga TRAINER, aktivna stranka *Test Stranka* (`stranka.test@fitlink.test` / `FitLinkTest!2026`) |
| TD-02 | Račun administratorja | `admin.test@fitlink.test` / `FitLinkTest!2026` (Test Admin) | vloga ADMIN |
| TD-03 | Napačno geslo | `NapacnoGeslo123!` | za TD-01 |
| TD-04 | Čakajoča prijava A | *Kandidat Ana* – `kandidat.a@fitlink.test` / `FitLinkTest!2026` | certifikat `kandidat_ana_certification.pdf`; uporabi se za zavrnitev |
| TD-05 | Čakajoča prijava B | *Kandidat Bor* – `kandidat.b@fitlink.test` / `FitLinkTest!2026` | certifikat `kandidat_bor_certification.pdf`; uporabi se za odobritev |
| TD-06 | Prekratek razlog zavrnitve | `abc` | manj kot 5 znakov |
| TD-07 | Veljaven razlog zavrnitve | `Certifikat ni veljaven.` | |
| TD-08 | Ime predloge | `Push dan A` | |
| TD-09 | Seti | 3 × (10 ponovitev, 60 kg, 90 s počitka) | |

---

## 5. Specifikacije testnih primerov

> Stolpci **Dejanski rezultat**, **Status** in **Dokaz** so izpolnjeni med izvedbo #1 (23. 10. 2026). Status: **P** (Pass – uspešno), **F** (Fail – dejanski rezultat odstopa od pričakovanega), **B** (Blocked – ni bilo mogoče izvesti). Dokaz z oznako *(#2)* je iz ponovne izvedbe koraka (glej poglavje 6).

### TS-01 Prijava in usmerjanje glede na vlogo

| Polje | Vrednost |
|---|---|
| **ID** | TS-01 |
| **Naziv** | Prijava in usmerjanje glede na vlogo |
| **Cilj** | Preveriti, da se uporabnik s pravilnimi podatki prijavi, da se ob napačnih prikaže napaka in da vsaka vloga dostopa samo do svojih strani. |
| **Sledljivost** | F-01, F-02 |
| **Prioriteta** | Visoka |
| **Odgovorna oseba** | Nino Gubič |
| **Predpogoji** | Okolje iz 4.1 teče (backend in MongoDB v Dockerju prek `docker compose up`, webapp prek `npm run dev`); računa TD-01 in TD-02 obstajata v Firebase in v bazi; uporabnik ni prijavljen. |
| **Testni podatki** | TD-01, TD-02, TD-03 |
| **Merilo uspešnosti** | Vsi koraki imajo status P. |

| # | Korak | Vhod | Pričakovani rezultat | Dejanski rezultat | Status | Dokaz |
|---|---|---|---|---|---|---|
| 1 | Odpri stran za prijavo | URL `/login` | Prikaže se obrazec za prijavo (*SIGN IN / Welcome back*). | Prikazan obrazec *SIGN IN – Welcome back* s poljema EMAIL in PASSWORD ter gumboma *Log in* in *Sign in with Google*. | P | [TS-01-K1](testing/testing-scenarios/TS-01-K1-prijavni-obrazec.png) |
| 2 | Vnesi e-pošto trenerja in napačno geslo, klikni prijavo | TD-01 (e-pošta), TD-03 | Pod obrazcem se prikaže sporočilo o napaki; uporabnik ostane na `/login`. | Pod obrazcem se prikaže *"Firebase: Error (auth/invalid-credential)."*; uporabnik ostane na `/login`. Sporočilo je tehnično, ni prijazno uporabniku (INC-01). | P | [TS-01-K2](testing/testing-scenarios/TS-01-K2-napacno-geslo.png) |
| 3 | Vnesi pravilne podatke trenerja, klikni prijavo | TD-01 | Preusmeritev na `/trainer`; prikaže se nadzorna plošča trenerja s seznamom strank. | Preusmeritev na `/trainer`; pozdrav *"Good evening, Coach Test"*, v *ACTIVE CLIENTS* je *Test Stranka*. | P | [TS-01-K3](testing/testing-scenarios/TS-01-K3-trener-nadzorna-plosca.png) |
| 4 | V naslovno vrstico ročno vpiši admin stran | URL `/admin` | Preusmeritev nazaj na `/trainer`; admin strani niso dostopne. | Aplikacija takoj preusmeri na `/trainer`; admin vsebina se ne prikaže. | P | [TS-01-K4](testing/testing-scenarios/TS-01-K4-trener-admin-preusmeritev.png) |
| 5 | Klikni *Sign out* | – | Uporabnik je odjavljen in preusmerjen na prijavo. | Odjava, preusmeritev na `/login`, obrazec je prazen. | P | [TS-01-K5](testing/testing-scenarios/TS-01-K5-odjava.png) |
| 6 | Kot neprijavljen uporabnik ročno vpiši stran trenerja | URL `/trainer` | Preusmeritev na `/login`. | Preusmeritev na `/login`. | P | [TS-01-K6](testing/testing-scenarios/TS-01-K6-neprijavljen-preusmeritev.png) |
| 7 | Prijavi se kot administrator | TD-02 | Preusmeritev na `/admin`; prikaže se seznam prijav trenerjev. | Preusmeritev na `/admin`; *"2 pending reviews"* – Kandidat Ana in Kandidat Bor. | P | [TS-01-K7](testing/testing-scenarios/TS-01-K7-admin-prijava.png) |

**Rezultat TS-01: USPEŠNO (7/7 P).**

**Končni pogoji:** uporabnik je prijavljen kot ADMIN (lahko se nadaljuje s TS-02).

---

### TS-02 Obravnava prijave trenerja

| Polje | Vrednost |
|---|---|
| **ID** | TS-02 |
| **Naziv** | Obravnava prijave trenerja (odobritev in zavrnitev) |
| **Cilj** | Preveriti, da administrator vidi podrobnosti prijave in certifikat, da sistem zavrne prekratek razlog zavrnitve ter da odobritev in zavrnitev pravilno spremenita stanje prijave. |
| **Sledljivost** | F-03 |
| **Prioriteta** | Visoka |
| **Odgovorna oseba** | Nino Gubič |
| **Predpogoji** | Okolje iz 4.1 teče (backend in MongoDB v Dockerju prek `docker compose up`, webapp prek `npm run dev`); prijavljen administrator (TD-02); v bazi obstajata čakajoči prijavi TD-04 in TD-05 s certifikatom. |
| **Testni podatki** | TD-04, TD-05, TD-06, TD-07 |
| **Merilo uspešnosti** | Vsi koraki imajo status P. |

| # | Korak | Vhod | Pričakovani rezultat | Dejanski rezultat | Status | Dokaz |
|---|---|---|---|---|---|---|
| 1 | Odpri seznam prijav | URL `/admin` | Prikažeta se prijavi TD-04 in TD-05 s statusom čakanja. | Prikazani obe prijavi z oznako *PENDING* in *Cert attached*. | P | [TS-02-K1](testing/testing-scenarios/TS-02-K1-seznam-prijav.png) |
| 2 | Odpri podrobnosti prijave A | klik na TD-04 | Odpre se `/admin/applications/:id` z oznako *PENDING*, podatki kandidata in predogledom certifikata. | Odpre se `/admin/applications/6adbba53…`; oznaka *PENDING*, bio, specializaciji MOČ in HUJŠANJE, predogled PDF certifikata. | P | [TS-02-K2](testing/testing-scenarios/TS-02-K2-podrobnosti-prijave.png) |
| 3 | Prenesi certifikat | klik na *Download* | Datoteka certifikata se prenese in jo je mogoče odpreti. | Sproži se prenos `kandidat_ana_certification.pdf` (application/pdf, 615 B, veljavna glava `%PDF-1.4`); vsebina je vidna v predogledu. | P | [TS-02-K3](testing/testing-scenarios/TS-02-K3-certifikat.png) |
| 4 | Klikni *Reject*, vpiši prekratek razlog, potrdi z *Reject application* | TD-06 | Prikaže se obvestilo *"Please write a short reason (at least 5 characters)."*; prijava ostane v stanju čakanja. | Prikaže se obvestilo *"Please write a short reason (at least 5 characters)."*; okno ostane odprto, prijava ostane *PENDING*. | P | [TS-02-K4](testing/testing-scenarios/TS-02-K4-prekratek-razlog.png), [obvestilo (#2)](testing/testing-scenarios/TS-02-K4-prekratek-razlog-obvestilo.png) |
| 5 | Vpiši veljaven razlog, potrdi z *Reject application* | TD-07 | Obvestilo *"<ime> rejected."*; preusmeritev na `/admin`; prijave A ni več na seznamu. | Obvestilo *"Kandidat Ana rejected."*; preusmeritev na `/admin`; *"1 pending review"* – samo Kandidat Bor. V bazi: `status: REJECTED`, `rejectionReason: "Certifikat ni veljaven."`. | P | [TS-02-K5](testing/testing-scenarios/TS-02-K5-zavrnitev.png), [obvestilo (#2)](testing/testing-scenarios/TS-02-K5-zavrnitev-obvestilo.png) |
| 6 | Odpri podrobnosti prijave B in klikni *Approve* | klik na TD-05 | Obvestilo *"<ime> approved as a trainer."*; preusmeritev na `/admin`; prijave B ni več na seznamu. | Obvestilo *"Kandidat Bor approved as a trainer."*; preusmeritev na `/admin`; *"No pending applications"*. Obvestilo je zaradi prosojnega ozadja slabo berljivo (INC-04). | P | [TS-02-K6](testing/testing-scenarios/TS-02-K6-odobritev.png), [obvestilo (#2)](testing/testing-scenarios/TS-02-K6-odobritev-obvestilo.png) |
| 7 | Odjavi se in se prijavi z računom odobrenega kandidata | račun TD-05 | Uporabnik ima vlogo TRAINER in je preusmerjen na `/trainer`. | Prijava `kandidat.b@fitlink.test` → `/trainer`, oznaka *TRAINER*, *"Good evening, Coach Kandidat"*, 0 strank. | P | [TS-02-K7](testing/testing-scenarios/TS-02-K7-odobren-kandidat-trener.png) |

**Rezultat TS-02: USPEŠNO (7/7 P).**

**Končni pogoji:** prijava A je zavrnjena, prijava B odobrena. Za ponovno izvedbo je treba pripraviti nove čakajoče prijave.

---

### TS-03 Ustvarjanje predloge treninga za stranko

| Polje | Vrednost |
|---|---|
| **ID** | TS-03 |
| **Naziv** | Ustvarjanje predloge treninga za stranko |
| **Cilj** | Preveriti, da urejevalnik predloge zavrne nepopoln vnos s pravilnim sporočilom, da vaje ni mogoče pustiti brez setov, in da se veljavna predloga shrani in dodeli stranki. |
| **Sledljivost** | F-04 |
| **Prioriteta** | Srednja |
| **Odgovorna oseba** | Nino Gubič |
| **Predpogoji** | Okolje iz 4.1 teče (backend in MongoDB v Dockerju prek `docker compose up`, webapp prek `npm run dev`); prijavljen trener (TD-01), ki ima vsaj eno stranko; v knjižnici vaj obstaja vsaj ena vaja. |
| **Testni podatki** | TD-08, TD-09 |
| **Merilo uspešnosti** | Vsi koraki imajo status P. |

| # | Korak | Vhod | Pričakovani rezultat | Dejanski rezultat | Status | Dokaz |
|---|---|---|---|---|---|---|
| 1 | Na `/trainer` odpri stranko in zavihek s predlogami | klik na stranko, nato *Templates* | Odpre se `/trainer/clients/:traineeId`; viden je razdelek *WORKOUT TEMPLATES*. | Odpre se profil *Test Stranka*; na zavihku *Templates · 0* je razdelek *WORKOUT TEMPLATES* z gumbom *New template*. | P | [TS-03-K1](testing/testing-scenarios/TS-03-K1-profil-stranke-predloge.png) |
| 2 | Klikni *New template* | – | Odpre se urejevalnik predloge s praznim imenom in brez vaj. | Odpre se *NEW TEMPLATE FOR CLIENT*: prazno ime, 0 vaj, 0 setov. | P | [TS-03-K2](testing/testing-scenarios/TS-03-K2-urejevalnik.png) |
| 3 | Pusti ime prazno, klikni *Create template* | ime: prazno | Napaka *"Give your template a name."*; predloga se ne shrani. | Napaka *"Give your template a name."*; urejevalnik ostane odprt. | P | [TS-03-K3](testing/testing-scenarios/TS-03-K3-prazno-ime.png) |
| 4 | Vpiši ime, brez vaj klikni *Create template* | TD-08 | Napaka *"Add at least one exercise."*; predloga se ne shrani. | Napaka *"Add at least one exercise."*; urejevalnik ostane odprt. | P | [TS-03-K4](testing/testing-scenarios/TS-03-K4-brez-vaj.png) |
| 5 | Klikni *Pick exercises from the library*, izberi eno vajo | iskanje `bench press`, vaja *Barbell Bench Press - Medium Grip* | Vaja se doda na seznam *EXERCISES*. | Vaja je dodana s privzetimi 3 seti (10 ponovitev, 0 kg). Napaka iz koraka 4 ostane prikazana, čeprav ni več veljavna (INC-02). | P | [izbira](testing/testing-scenarios/TS-03-K5a-izbira-vaje.png), [TS-03-K5](testing/testing-scenarios/TS-03-K5b-vaja-dodana.png) |
| 6 | Odstrani en set z *"− Remove last"*, nato poskusi odstraniti še preostale sete | 3 seti → odstranjevanje | *"− Remove last"* odstrani en set. Ko ostane en set, gumb *"− Remove last"* izgine, ker mora imeti vaja vsaj en set (prikaže se *"At least one set required"*). | Po prvem kliku *2 Sets* (glava: 2 sets, ~4 min). Po drugem kliku *1 Set*; gumb *"− Remove last"* izgine, prikaže se *"At least one set required"*. Vaje brez setov ni mogoče ustvariti. | P | [en set manj](testing/testing-scenarios/TS-03-K6a-odstranjen-en-set.png), [zadnji set](testing/testing-scenarios/TS-03-K6b-zadnjega-seta-ni-mogoce-odstraniti.png) |
| 7 | Preostalemu setu nastavi podatke, dodaj sete do 3 in klikni *Create template* | TD-09 | Obvestilo *"\"Push dan A\" assigned to your client."*; urejevalnik se zapre. | Set 1 nastavljen na 10 / 60 kg / 1 min 30 s, z *ADD SET* dodana 2 seta (prevzameta vrednosti) → 3 seti. Obvestilo *"\"Push dan A\" assigned to your client."*; urejevalnik se zapre, zavihek pokaže *Templates · 1*. | P | [vnos](testing/testing-scenarios/TS-03-K7a-seti-vneseni.png), [obvestilo](testing/testing-scenarios/TS-03-K7b-shranjeno-obvestilo.png) |
| 8 | Preveri seznam predlog in odpri novo predlogo | – | Predloga *Push dan A* je na seznamu; vaja in 3 seti se ujemajo z vnosom. | Predloga je na seznamu; podrobnosti: 1 vaja, 3 seti 10 / 60 kg / 1m 30s – ujema se z vnosom in z zapisom v bazi (`targetReps: 10, targetWeightKg: 60, restSeconds: 90`). Ocena trajanja se razlikuje: kartica *~5 min*, podrobnosti *~7 min* (INC-03). | P | [TS-03-K8](testing/testing-scenarios/TS-03-K8-predloga-podrobnosti.png) |

**Rezultat TS-03: USPEŠNO (8/8 P).**

**Končni pogoji:** stranka ima dodeljeno predlogo *Push dan A*.

---

## 6. Dnevnik izvedbe testov

*(Test Execution Log)*

| Izvedba | Datum in ura | Scenarij | Izvajalec | Okolje (URL, brskalnik, commit) | Rezultat (P/F/B) | Incident | Dokazi (posnetki zaslona) |
|---|---|---|---|---|---|---|---|
| #1 | 23. 10. 2026, 21:50–21:52 | TS-01 | Nino Gubič | `localhost:5173` (npm run dev), backend + MongoDB v Dockerju, Chrome 155, commit `3257d05` | P (7/7) | INC-01 | [TS-01-K1 … K7](testing/testing-scenarios/) |
| #1 | 23. 10. 2026, 21:52–21:54 | TS-02 | Nino Gubič | `localhost:5173` (npm run dev), backend + MongoDB v Dockerju, Chrome 155, commit `3257d05` | P (7/7) | INC-04 | [TS-02-K1 … K7](testing/testing-scenarios/) |
| #2 | 23. 10. 2026, 21:58–22:01 | TS-02 (K4–K6) | Nino Gubič | enako kot #1, podatki ponastavljeni z `npm run seed` | P (3/3) | – | datoteke s pripono `-obvestilo` |
| #1 | 23. 10. 2026, 22:08–22:11 | TS-03 | Nino Gubič | `localhost:5173` (npm run dev), backend + MongoDB v Dockerju, Chrome 155, commit `3257d05` | P (8/8) | INC-02, INC-03 | [TS-03-K1 … K8](testing/testing-scenarios/) |


---

## 7. Poročila o incidentih

*(Test Incident Report)* – incident je odprt za vsak korak s statusom F ali B ter za vsako opaženo odstopanje od pričakovanega obnašanja, tudi če je korak uspešen. Okolje pri vseh incidentih: lokalno okolje iz 4.1, Chrome 155, commit `3257d05`. Prijavitelj pri vseh: Nino Gubič, 23. 10. 2026.

### INC-01 Tehnično sporočilo ob napačnem geslu

| Polje | Vrednost |
|---|---|
| **ID incidenta** | INC-01 |
| **Scenarij / korak** | TS-01, korak 2 (status koraka: P) |
| **Vrsta** | uporabnost |
| **Opis** | Ob napačnem geslu se uporabniku prikaže surovo sporočilo Firebase SDK, namesto razumljivega sporočila. |
| **Koraki za ponovitev** | 1. Odpri `/login`. 2. Vnesi `trener.test@fitlink.test` in napačno geslo. 3. Klikni *Log in*. |
| **Pričakovani rezultat** | Razumljivo sporočilo, npr. *"Napačen e-naslov ali geslo."* |
| **Dejanski rezultat** | *"Firebase: Error (auth/invalid-credential)."* |
| **Vzrok** | `LoginPage.tsx` prikaže `err.message` neposredno, brez preslikave kod napak Firebase. |
| **Resnost / prioriteta** | Nizka / Srednja |
| **Priloge** | [TS-01-K2](testing/testing-scenarios/TS-01-K2-napacno-geslo.png) |
| **Status** | Odprt |

### INC-02 Sporočilo o napaki ostane po odpravi vzroka

| Polje | Vrednost |
|---|---|
| **ID incidenta** | INC-02 |
| **Scenarij / korak** | TS-03, korak 5 (status koraka: P) |
| **Vrsta** | napaka v uporabniškem vmesniku |
| **Opis** | Napaka *"Add at least one exercise."* ostane prikazana tudi po tem, ko je vaja dodana. Počisti se šele ob naslednjem kliku *Create template*. |
| **Koraki za ponovitev** | 1. *New template*, vpiši ime. 2. Klikni *Create template* (prikaže se napaka). 3. Dodaj vajo. |
| **Pričakovani rezultat** | Ko je vzrok odpravljen, sporočilo izgine. |
| **Dejanski rezultat** | Sporočilo ostane vidno ob veljavnem vnosu. |
| **Resnost / prioriteta** | Nizka / Nizka |
| **Priloge** | [TS-03-K5](testing/testing-scenarios/TS-03-K5b-vaja-dodana.png), [TS-03-K6](testing/testing-scenarios/TS-03-K6a-odstranjen-en-set.png) |
| **Status** | Odprt |

### INC-03 Neskladna ocena trajanja predloge

| Polje | Vrednost |
|---|---|
| **ID incidenta** | INC-03 |
| **Scenarij / korak** | TS-03, korak 8 (status koraka: P) |
| **Vrsta** | napaka v logiki prikaza |
| **Opis** | Za isto predlogo (3 seti, 90 s počitka) kartica na seznamu kaže *~5 min*, podrobnosti in urejevalnik pa *~7 min*. |
| **Koraki za ponovitev** | 1. Ustvari predlogo s 3 seti in počitkom 90 s. 2. Primerjaj kartico na seznamu in okno s podrobnostmi. |
| **Pričakovani rezultat** | Enaka ocena trajanja na vseh mestih. |
| **Dejanski rezultat** | ~5 min (kartica) proti ~7 min (podrobnosti). |
| **Vzrok** | Kartica računa `sets × 105 s` (`WorkoutsTab.tsx:46`) in ne upošteva počitka; podrobnosti računajo `45 s + počitek` na set (`TemplateDetailModal.tsx:116`, `TemplateEditorModal.tsx:164`). |
| **Resnost / prioriteta** | Nizka / Nizka |
| **Priloge** | [kartica ~5 min](testing/testing-scenarios/TS-03-K7b-shranjeno-obvestilo.png), [podrobnosti ~7 min](testing/testing-scenarios/TS-03-K8-predloga-podrobnosti.png) |
| **Status** | Odprt |

### INC-04 Slabo berljiva obvestila (toast)

| Polje | Vrednost |
|---|---|
| **ID incidenta** | INC-04 |
| **Scenarij / korak** | TS-02, koraka 5 in 6 (status korakov: P) |
| **Vrsta** | uporabnost / dostopnost |
| **Opis** | Obvestilo o uspehu ima prosojno ozadje in je slabo vidno |
| **Koraki za ponovitev** | 1. Zavrni ali odobri prijavo. 2. Opazuj obvestilo v zgornjem desnem kotu nad pasico *ADMIN · TRAINER APPLICATIONS*. |
| **Pričakovani rezultat** | Obvestilo je jasno berljivo ne glede na vsebino pod njim. |
| **Dejanski rezultat** | Del obvestila leži na temno modri podlagi, kontrast je nizek. |
| **Vzrok** | Barve ozadja v `Toast.tsx` (`TONE_STYLE`) so poltransparentne. |
| **Resnost / prioriteta** | Nizka / Nizka |
| **Priloge** | [TS-02-K5 (#2)](testing/testing-scenarios/TS-02-K5-zavrnitev-obvestilo.png), [TS-02-K6 (#2)](testing/testing-scenarios/TS-02-K6-odobritev-obvestilo.png) |
| **Status** | Odprt |

---

## 8. Poročilo o zaključku testiranja

*(Test Completion Report)*

### 8.1 Povzetek

| Scenarij | Št. korakov | Uspešni (P) | Neuspešni (F) | Blokirani (B) | Končni status |
|---|---|---|---|---|---|
| TS-01 | 7 | 7 | 0 | 0 | USPEŠNO |
| TS-02 | 7 | 7 | 0 | 0 | USPEŠNO |
| TS-03 | 8 | 8 | 0 | 0 | USPEŠNO |
| **Skupaj** | **22** | **22** | **0** | **0** | 3 / 3 scenarijev uspešnih |

| Funkcionalnost | Pokrita s | Ocena |
|---|---|---|
| F-01 Prijava | TS-01 K1–K3, K7 | deluje; sporočilo o napaki ni prijazno uporabniku (INC-01) |
| F-02 Usmerjanje po vlogah | TS-01 K3–K7, TS-02 K7 | deluje |
| F-03 Obravnava prijav trenerjev | TS-02 K1–K7 | deluje |
| F-04 Predloge treninga | TS-03 K1–K8 | deluje; manjše napake v vmesniku (INC-02, INC-03) |

### 8.2 Odstopanja od načrta

- **Izvedba #2:** koraki TS-02 K4–K6 so bili ponovljeni zgolj za slikovni dokaz obvestil, ki izginejo po 4 s. Rezultati so enaki prvi izvedbi.
- Okolje se od načrtovanega ni razlikovalo. Testni podatki so bili pripravljeni s skripto `scripts/seed-test-data` namesto ročno.

### 8.3 Odkrite napake

| ID incidenta | Scenarij | Vrsta | Resnost | Kratek opis | Status |
|---|---|---|---|---|---|
| INC-01 | TS-01 | uporabnost | Nizka | Surovo sporočilo Firebase ob napačnem geslu | Odprt |
| INC-02 | TS-03 | vmesnik | Nizka | Sporočilo o napaki ostane po odpravi vzroka | Odprt |
| INC-03 | TS-03 | logika prikaza | Nizka | Neskladna ocena trajanja (~5 min / ~7 min) | Odprt |
| INC-04 | TS-02 | uporabnost | Nizka | Prosojna obvestila so slabo berljiva | Odprt |

Kritičnih ali visokih napak ni bilo odkritih.

### 8.4 Preostala tveganja

- **Ni testirano:** prijava z Googlom, pozabljeno geslo, klepet v realnem času, zdravstveni podatki in check-ini stranke, urejanje in brisanje predlog, končanje sodelovanja (*End coaching*).
- **Brskalniki:** testirano samo v Chrome 155 na namizni ločljivosti; Firefox, Safari in mobilni pogled niso preverjeni.
- **Konzola:** ponavljajoči se odgovori `404` na `/api/health/client/{id}` za stranke brez podatkov.

### 8.5 Zaključek

Vsi trije scenariji so uspešni (22/22 korakov), funkcionalnosti F-01 do F-04 izpolnjujejo zahteve. Odkriti so bili štirje incidenti nizke resnosti, vsi s področja uporabnosti in prikaza; kritičnih ali visokih napak ni.

**Priporočila:**

1. Preslikati kode napak Firebase v razumljiva sporočila (INC-01).
2. Poenotiti izračun trajanja predloge v skupno funkcijo (INC-03) ter počistiti napake ob spremembi vnosa (INC-02).
3. Obvestilom dati neprosojno ozadje (INC-04).
