package si.feri.fitlink.videocall;

import java.time.Instant;
import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;

/**
 *   POST /api/video-calls/conversations/{conversationId}    create (trainer)
 *   POST /api/video-calls/{id}/accept             trainee accepts
 *   POST /api/video-calls/{id}/decline         trainee declines
 *   POST /api/video-calls/{id}/cancel               trainer cancels
 *   GET  /api/video-calls/{id}                       read one
 *   GET  /api/video-calls/conversations/{conversationId}    list per conversation
 *   GET  /api/video-calls/me/upcoming            upcoming for current user
 */
@RestController
@RequestMapping("/api/video-calls")
@RequiredArgsConstructor
public class VideoCallController {

    private final VideoCallService service;

    @PostMapping("/conversations/{conversationId}")
    public VideoCallRequest schedule(
        @AuthenticationPrincipal AuthPrincipal principal,
        @PathVariable String conversationId,
        @RequestBody ScheduleBody body
    ) {
        return service.schedule(
            principal.uid(),
            conversationId,
            body.scheduledFor(),
            body.instant() != null && body.instant()
        );
    }

    @PostMapping("/{id}/accept")
    public VideoCallRequest accept(
        @AuthenticationPrincipal AuthPrincipal principal,
        @PathVariable String id
    ) {
        return service.accept(id, principal.uid());
    }

    @PostMapping("/{id}/decline")
    public VideoCallRequest decline(
        @AuthenticationPrincipal AuthPrincipal principal,
        @PathVariable String id,
        @RequestBody(required = false) DeclineBody body
    ) {
        return service.decline(id, principal.uid(), body == null ? null : body.reason());
    }

    @PostMapping("/{id}/cancel")
    public VideoCallRequest cancel(
        @AuthenticationPrincipal AuthPrincipal principal,
        @PathVariable String id
    ) {
        return service.cancel(id, principal.uid());
    }

    @GetMapping("/{id}")
    public VideoCallRequest get(
        @AuthenticationPrincipal AuthPrincipal principal,
        @PathVariable String id
    ) {
        return service.get(id, principal.uid());
    }

    @GetMapping("/conversations/{conversationId}")
    public List<VideoCallRequest> listForConversation(
        @AuthenticationPrincipal AuthPrincipal principal,
        @PathVariable String conversationId
    ) {
        return service.listForConversation(conversationId, principal.uid());
    }

    @GetMapping("/me/upcoming")
    public List<VideoCallRequest> upcoming(@AuthenticationPrincipal AuthPrincipal principal) {
        List<VideoCallRequest> trainee = service.upcomingForTrainee(principal.uid());
        List<VideoCallRequest> trainer = service.upcomingForTrainer(principal.uid());
        java.util.LinkedHashMap<String, VideoCallRequest> byId = new java.util.LinkedHashMap<>();
        for (VideoCallRequest c : trainee) byId.put(c.getId(), c);
        for (VideoCallRequest c : trainer) byId.putIfAbsent(c.getId(), c);
        return List.copyOf(byId.values());
    }

    @GetMapping("/me/window")
    public List<VideoCallRequest> windowForMe(
        @AuthenticationPrincipal AuthPrincipal principal,
        @RequestParam("from") Instant from,
        @RequestParam("to") Instant to
    ) {
        return service.windowForUser(principal.uid(), from, to);
    }

    public record ScheduleBody(Instant scheduledFor, Boolean instant) {}

    public record DeclineBody(String reason) {}
}
