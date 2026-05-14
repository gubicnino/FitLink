package si.feri.fitlink.config;

// Initializes the Firebase Admin SDK as a Spring Bean.
// Required before any FirebaseAuth.getInstance() call (token verification, FCM, etc.).
// Reads credentials from src/main/resources/firebase-service-account.json —
// download this file from the Firebase Console → Project Settings → Service Accounts
// and NEVER commit it to version control.

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

@Configuration
public class FirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        GoogleCredentials credentials = GoogleCredentials
                .fromStream(new ClassPathResource("firebase-service-account.json").getInputStream());

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();

        return FirebaseApp.initializeApp(options);
    }
}
