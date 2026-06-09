# FitLink

> Mobilna platforma za izmenjavo veščin in znanj na področju fitnesa, kjer trenerji delijo svoje strokovno znanje s treniranci, treniranci pa nudijo realne podatke o napredku in povratno informacijo.

---

## Vsebina

- [Pregled](#pregled)
- [Funkcionalnosti](#funkcionalnosti)
- [Arhitektura](#arhitektura)
- [Screenshots](#screenshots)
- [Navodila za razvoj](#navodila-za-razvoj)
- [Navodila za namestitev](#navodila-za-namestitev)

---

## Pregled

FitLink je mobilna aplikacija, ki trenerjem omogoča celovit management trenirancev — treningi, zdravstveni podatki iz nosljivih naprav in tedenski check-ini vse na enem mestu. Ta centraliziran vpogled v napredek vsake stranke v realnem času trenerjem omogoča personalizirano vodenje, kar je glavna prednost FitLink od stalih fitnes aplikacij. Treniranci z aplikacijo beležijo treninge, spremljajo napredek in ostajajo v stiku s svojim trenerjem. Poleg tega lahko trenerji objavljajo brezplačne izobraževalne tečaje s področja fitnessa in prehrane, kar spodbuja izmenjavo znanja in veščin znotraj skupnosti.

---

## Funkcionalnosti

Funkcionalnosti so razvrščene po vlogah: **treniranec** (prejemnik mentorstva), **trener** (ponudnik znanja in mentorstva), **administrator** (skrbnik kakovosti).

### Treniranec

- Ustvarjanje in urejanje predlog treningov
- Live tracking treninga s shranjevanjem zgodovine
- Tedenski check-in
- Pregled in opravljanje brezplačnih tečajev
- Sinhronizacija zdravstvenih podatkov iz Health Connect
- Iskanje in povezovanje s trenerjem

### Trener

- Vodenje več trenirancev hkrati
- Ustvarjanje in urejanje predlog treningov za posameznega treniranca
- Pregled zgodovine treningov in zdravstvenih podatkov vsakega treniranca
- Pregled tedenskih check-inov in komentiranje
- Objavljanje brezplačnih tečajev

### Administrator

- Pregled in potrjevanje licenc trenerjev

---

## Arhitektura

<img width="2030" height="1401" alt="architecture" src="https://github.com/user-attachments/assets/f320921b-0d35-4d0e-92dd-c6c04e65322f" />



---

## Screenshots

<img width="1899" height="767" alt="image" src="https://github.com/user-attachments/assets/017d8bd0-88f1-4c55-ba71-661cef1e305c" />
<img width="1910" height="765" alt="image" src="https://github.com/user-attachments/assets/708ca99e-d070-4f8b-97c3-abcb2686b948" />

---

## Navodila za razvoj

### Predpogoji

- **Java 21** – `java --version`
- **Node.js 22 LTS** + **npm 10+** – `node --version`
- **Android Studio** s Platform SDK 34 (API level 34, Android 14)
- **Docker** in **Docker Compose**

### 1. Klon repozitorija

```bash
git clone https://github.com/gubicnino/FitLink.git
cd FitLink
```

### 2. Ustvari svoj firebase projekt
- Pojdi na console.firebase.google.com
- Ustvari nov projekt (npr. fitlink-dev-ime)
- Dodaj Android app z package name si.fitlink.app
- Prenesi google-services.json in ga naloži v mobile/android/app/
- Pojdi v Settings - Service accounts - Generate new private key - prenesi firebase-adminsdk.json in ga naloži v backend/src/main/resources/
- Omogoči Authentication - Sign-in methods - Email/Password in Google

### 3. Backend

za razvoj je lažje na dockerju zagnati samo mongodb in backend v konzoli 
```bash
docker compose up mongodb
cd backend
mvn spring-boot:run
```

Backend bo dosegljiv na `http://localhost:8080`.


### 4. Mobile (Android)

#### Priprava Android emulatorja

1. Odpri **Android Studio**
2. Pojdi na **Tools - Device Manager**
3. Klikni **Create Device**
4. Izberi poljubno napravo 
5. Prenesi in izberi sistemsko sliko **Android 14 (API 34)** ali novejšo
6. Zaključi ustvarjanje naprave in zaženi emulator

Preveri, da ADB pravilno zazna emulator:

```bash
adb devices
```

Izpis mora vsebovati napravo podobno:

```bash
List of devices attached
emulator-5554   device
```

Če ukaz `adb` ni prepoznan, dodaj Android SDK Platform Tools v sistemski PATH

#### Zagon aplikacije

Ustvari `.env` datoteko v mapi `mobile/`:

```env
API_BASE_URL=http://10.0.2.2:8080
```

> **Opomba:** `10.0.2.2` je poseben naslov, ki Android emulatorju omogoča dostop do `localhost` gostiteljskega računalnika, kjer teče Spring Boot backend.


```bash
cd mobile
npm install

# zaženi Metro bundler
npm start

# v novem terminalu zaženi aplikacijo
npx react-native run-android --no-packager
```

### Konvencije

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- **Code style:** backend – Google Java Style; mobile – ESLint + Prettier (config v repozitoriju).

---


## Navodila za namestitev
1. Prenesi najnovejšo APK datoteko iz Releases sekcije repozitorija.
2. Prenesi APK na Android napravo.
3. Omogoči "Install unknown apps" za izbran brskalnik ali upravljalnik datotek.
4. Namesti APK.
5. Zaženi aplikacijo in se registriraj/prijavi.

Aplikacija uporablja produkcijski backend, zato dodatna konfiguracija ni potrebna.

### Sample uporabniki
Uporabniki za namen pregleda in testiranja aplikacije

#### Trenerji
James Carter: jamescarter@gmail.com | jamescarter1
Sarah Mills: sarahmills@gmail.com | sarahmills1

#### Treniranci
Tom Evans: tomevans@gmail.com | tomevans1
Emma Walsh: emmawalsh@gmail.com| emmawalsh1
Luke Harris: lukeharris@gmail.com | lukeharris1
Mia Chen: miachen@gmail.com| miachen1
Dan Ford: danford@gmail.com| danford1

---

