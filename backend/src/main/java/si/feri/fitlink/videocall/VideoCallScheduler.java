package si.feri.fitlink.videocall;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;



// Vsakih 5 MIN PREHODI PENDING VIDEO CALLS, KI SO ZAMUJENI, V EXPIRED IN VSE ACCEPTED/LIVE VIDEO CALLS, 
// ki SO STARI 2H, V COMPLETED.
@Component
@RequiredArgsConstructor
@Slf4j
public class VideoCallScheduler {

    private final VideoCallService service;

    @Scheduled(cron = "0 */5 * * * *")
    public void sweepStaleCalls() {
        try {
            int touched = service.sweepStale();
            if (touched > 0) {
                log.info("[video-call-cron] transitioned {} stale calls", touched);
            }
        } catch (Exception ex) {
            log.warn("[video-call-cron] sweep failed: {}", ex.getMessage());
        }
    }
}
