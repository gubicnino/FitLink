## Struktura backend

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