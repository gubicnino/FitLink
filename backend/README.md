# FitLink – Backend

Spring Boot REST API za platformo FitLink. Komunicira z mobilno aplikacijo in webapp-om prek JSON REST endpointov ter WebSocket-a.

---

## Tehnologije

| Tehnologija | Namen |
| Java 21 + Spring Boot 4 | Core framework |
| MongoDB + Spring Data | Baza in repozitoriji |
| Spring Security + Firebase Auth | Avtentikacija in avtorizacija |
| Spring WebSocket + STOMP | Real-time chat |
| Firebase Admin SDK | Push notifikacije (FCM) |
| Lombok | Redukcija boilerplate kode |
| Maven | Build tool |

---

## Struktura

```
src/main/java/si/feri/fitlink/
├── auth/             # Firebase token validacija, vloge
├── user/             # Profil, nastavitve
├── trainer/          # Verifikacija licenc
├── coaching/         # Trener-treniranec povezave
├── exercise/         # Knjižnica vaj
├── workout/          # Templates + dokončani treningi
├── checkin/          # Tedenski check-ini
├── course/           # Tečaji, ocene, komentarji
├── health/           # Garmin / Health Connect sync
├── call/             # Video klici (scheduling)
├── chat/             # WebSocket sporočila
├── notification/     # In-app & FCM notifikacije
├── config/           # Spring konfiguracije (Security, Mongo, Firebase)
└── common/           # Skupne DTO, GlobalExceptionHandler
```

Vsak domenski modul ima svojo mapo; skupna koda živi v `common/`.

---

## Konvencije

Slojita arhitektura po vzorcu **Repository → Service → Controller**.

**Repository** – dostop do baze
```java
public interface ExerciseRepository extends MongoRepository<Exercise, String> { ... }
```

**Service** – poslovna logika, označen z `@Service`
```java
@Service
@RequiredArgsConstructor
public class ExerciseService { ... }
```

**Controller** – REST endpointi, označen z `@RestController`
```java
@RestController
@RequestMapping("/api/exercises")
public class ExerciseController { ... }
```

- DTOji so ločeni od entitet (npr. `ExerciseDtos`, `WorkoutDtos`)
- Lombok `@Data`, `@RequiredArgsConstructor` za redukcijo kode
- Napake centralzirano v `GlobalExceptionHandler`
- Paketi sledijo domenam (DDD style)

---

## Zagon lokalno

```bash
mvn spring-boot:run
```

API je dostopen na `http://localhost:8080`.
