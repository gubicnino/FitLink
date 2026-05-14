package si.feri.fitlink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class FitlinkApplication {

	public static void main(String[] args) {
		SpringApplication.run(FitlinkApplication.class, args);
	}

}
