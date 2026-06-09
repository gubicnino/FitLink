# FitLink Mobile

Android mobilna aplikacija zgrajena z **React Native**, ki je del FitLink platforme.

---

## Tehnologije

- React Native 0.79
- TypeScript
- Firebase Authentication
- React Navigation
- Health Connect (Garmin, Apple Watch)
- Axios

---

## Design mockup
<img width="1910" height="765" alt="mockup2" src="https://github.com/user-attachments/assets/21e5f9d2-61ce-45cf-addc-90a429d3a66d" />
<img width="1899" height="767" alt="mockup1" src="https://github.com/user-attachments/assets/db8ded25-10d4-47d0-a47c-b1b283d3b3fd" />

---
## Struktura projekta
mobile/
├── android/          # Android native projekt
├── src/
│   ├── api/          # API klienti
│   ├── components/   # Deljene UI komponente
│   ├── hooks/        # Custom React hooks
│   ├── navigation/   # React Navigation konfiguracija
│   ├── screens/      # Ekrani po vlogah (admin, trainer, trainee)
│   ├── services/     # Business logika (auth, coaching...)
│   ├── theme/        # Barve, spacing, tipografija
│   └── types/        # TypeScript tipi
└── package.json

---

## Predpogoji

- **Node.js 22 LTS** + **npm 10+**
- **Java 21**
- **Android Studio** z Android SDK 36 (API 36)
- **Android emulator** ali fizična Android naprava

---

## Namestitev

```bash
cd mobile
npm install
```

### Konfiguracijske datoteke

#### `.env`
Ustvari `.env` datoteko v mapi `mobile/`:

```env
API_URL=http://10.0.2.2:8080
```

> `10.0.2.2` je poseben naslov ki Android emulatorju omogoča dostop do localhoста gostiteljskega računalnika.
> Za fizično napravo uporabi IP računalnika (npr. `192.168.1.X`) — naprava mora biti na isti WiFi mreži.

#### `google-services.json`
Postavi v `mobile/android/app/google-services.json`.  
Pridobi od skrbnika projekta ali ustvari [lasten Firebase projekt](https://console.firebase.google.com).

---

## Zagon

```bash
# Terminal 1 — Metro bundler
npm start

# Terminal 2 — Android app
npx react-native run-android --no-packager
```

---

## Fizična naprava

Namesto emulatorja lahko uporabljaš fizično Android napravo:

1. Omogoči **Developer options** (tapkaj 7x na Build number v Settings → About phone)
2. Omogoči **USB debugging**
3. Poveži napravo z USB
4. Preveri da ADB zazna napravo:
```bash
adb devices
```
5. Preusmeri port:
```bash
adb reverse tcp:8081 tcp:8081
```

---

## Build

### Debug APK (lokalno)
```bash
cd android
./gradlew assembleDebug
```
APK se nahaja v `android/app/build/outputs/apk/debug/`.

### Release APK
Release APK se avtomatično gradi prek GitHub Actions ob vsakem pushu na `main`.  
Dostopen je v **Releases** sekciji repozitorija.

---

## Konvencije

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- **Code style:** ESLint + Prettier (config v repozitoriju)
- **Komponente:** funkcionalne komponente z TypeScript
- **Imenovanje:** PascalCase za komponente, camelCase za funkcije in spremenljivke
