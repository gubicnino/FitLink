package si.feri.fitlink.videocall;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.domain.Message;
import si.feri.fitlink.chat.domain.MessageType;
import si.feri.fitlink.chat.event.ChatMessageSentEvent;
import si.feri.fitlink.chat.repo.ConversationRepository;
import si.feri.fitlink.chat.repo.MessageRepository;
import si.feri.fitlink.common.NotificationService;
import si.feri.fitlink.common.exception.ResourceNotFoundException;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoCallService {

    private static final String JITSI_BASE = "https://meet.jit.si/";
    private static final String ROOM_PREFIX = "fitlink-";

    private final VideoCallRepository repo;
    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;
    private final ApplicationEventPublisher events;
    private final NotificationService notifications;
    private final UserRepository userRepo;

    /**
     * Trainer schedules (or starts now) a call.
     *
     * @param scheduledFor null → instant call (status = LIVE), drugace ostane PENDING
     */
    @Transactional
    public VideoCallRequest schedule(
        String trainerId,
        String conversationId,
        Instant scheduledFor,
        boolean instant
    ) {
        Conversation conv = conversationRepo.findById(conversationId)
            .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        if (conv.getParticipantIds() == null || !conv.getParticipantIds().contains(trainerId)) {
            throw new AccessDeniedException("Not a participant of this conversation");
        }
        String traineeId = conv.getParticipantIds().stream()
            .filter(uid -> !uid.equals(trainerId))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Conversation has no peer"));

        Instant now = Instant.now();
        Instant target = instant || scheduledFor == null ? now : scheduledFor;

        String roomId = UUID.randomUUID().toString();
        String url = JITSI_BASE + ROOM_PREFIX + safeCoachingSegment(conv.getCoachingId()) + "-" + roomId;

        VideoCallRequest call = VideoCallRequest.builder()
            .conversationId(conversationId)
            .scheduledByUserId(trainerId)
            .trainerId(trainerId)
            .traineeId(traineeId)
            .coachingId(conv.getCoachingId())
            .scheduledFor(target)
            .meetingUrl(url)
            .status(instant ? VideoCallStatus.LIVE : VideoCallStatus.PENDING)
            .createdAt(now)
            .build();
        VideoCallRequest saved = repo.save(call);

        emitSystemMessage(saved, "scheduled");
        String trainerName = userRepo.findByFirebaseUid(trainerId)
            .map(User::getDisplayName)
            .filter(s -> s != null && !s.isBlank())
            .orElse(null);
        notifications.notifyVideoCallScheduled(
            traineeId,
            trainerName,
            conversationId,
            saved.getId(),
            instant
        );
        return saved;
    }

    @Transactional
    public VideoCallRequest accept(String callId, String traineeId) {
        VideoCallRequest call = mustOwnAsTrainee(callId, traineeId);
        if (call.getStatus() != VideoCallStatus.PENDING) {
            throw new IllegalStateException("Call is no longer pending");
        }
        call.setStatus(VideoCallStatus.ACCEPTED);
        call.setDecidedAt(Instant.now());
        VideoCallRequest saved = repo.save(call);
        emitSystemMessage(saved, "accepted");
        return saved;
    }

    @Transactional
    public VideoCallRequest decline(String callId, String traineeId, String reason) {
        VideoCallRequest call = mustOwnAsTrainee(callId, traineeId);
        if (call.getStatus() != VideoCallStatus.PENDING) {
            throw new IllegalStateException("Call is no longer pending");
        }
        call.setStatus(VideoCallStatus.DECLINED);
        call.setDecidedAt(Instant.now());
        if (reason != null && !reason.isBlank()) {
            call.setDeclineReason(reason.length() > 280 ? reason.substring(0, 280) : reason);
        }
        VideoCallRequest saved = repo.save(call);
        emitSystemMessage(saved, "declined");
        return saved;
    }

    @Transactional
    public VideoCallRequest cancel(String callId, String trainerId) {
        VideoCallRequest call = repo.findById(callId)
            .orElseThrow(() -> new ResourceNotFoundException("Call not found"));
        if (!trainerId.equals(call.getTrainerId())) {
            throw new AccessDeniedException("Only the trainer can cancel");
        }
        if (call.getStatus() != VideoCallStatus.PENDING && call.getStatus() != VideoCallStatus.LIVE) {
            throw new IllegalStateException("Call cannot be cancelled in its current state");
        }
        call.setStatus(VideoCallStatus.CANCELLED);
        call.setDecidedAt(Instant.now());
        VideoCallRequest saved = repo.save(call);
        emitSystemMessage(saved, "cancelled");
        return saved;
    }

    public VideoCallRequest get(String callId, String userId) {
        VideoCallRequest call = repo.findById(callId)
            .orElseThrow(() -> new ResourceNotFoundException("Call not found"));
        if (!userId.equals(call.getTrainerId()) && !userId.equals(call.getTraineeId())) {
            throw new AccessDeniedException("Not a participant");
        }
        return call;
    }

    public List<VideoCallRequest> listForConversation(String conversationId, String userId) {
        return repo.findByConversationIdOrderByScheduledForDesc(conversationId);
    }

    /** Upcoming calls for the trainee's dashboard "Sessions" card. */
    public List<VideoCallRequest> upcomingForTrainee(String traineeId) {
        return repo.findByTraineeIdAndStatusInOrderByScheduledForAsc(
            traineeId, List.of(VideoCallStatus.PENDING, VideoCallStatus.ACCEPTED, VideoCallStatus.LIVE));
    }

    /** Same for trainer. */
    public List<VideoCallRequest> upcomingForTrainer(String trainerId) {
        return repo.findByTrainerIdAndStatusInOrderByScheduledForAsc(
            trainerId, List.of(VideoCallStatus.PENDING, VideoCallStatus.ACCEPTED, VideoCallStatus.LIVE));
    }

    /**
     * vrne VSE calle (vključno COMPLETED, EXPIRED, DECLINED, CANCELLED) v časovnem oknu
     * za uporabnika v vlogi trenerja ali traineeja. To nucan ka te zoven na koledarji.
     */
    public List<VideoCallRequest> windowForUser(String userId, Instant from, Instant to) {
        List<VideoCallRequest> asTrainee = repo
            .findByTraineeIdAndScheduledForBetweenOrderByScheduledForAsc(userId, from, to);
        List<VideoCallRequest> asTrainer = repo
            .findByTrainerIdAndScheduledForBetweenOrderByScheduledForAsc(userId, from, to);
        java.util.LinkedHashMap<String, VideoCallRequest> byId = new java.util.LinkedHashMap<>();
        for (VideoCallRequest c : asTrainee) byId.put(c.getId(), c);
        for (VideoCallRequest c : asTrainer) byId.putIfAbsent(c.getId(), c);
        return List.copyOf(byId.values());
    }

    @Transactional
    public int sweepStale() {
        Instant now = Instant.now();
        Instant completedCutoff = now.minus(2, ChronoUnit.HOURS);
        int touched = 0;

        for (VideoCallRequest c : repo.findByStatusInAndScheduledForBefore(List.of(VideoCallStatus.PENDING), now)) {
            c.setStatus(VideoCallStatus.EXPIRED);
            c.setDecidedAt(now);
            repo.save(c);
            emitSystemMessage(c, "expired");
            touched++;
        }
        for (VideoCallRequest c : repo.findByStatusInAndScheduledForBefore(
            List.of(VideoCallStatus.ACCEPTED, VideoCallStatus.LIVE), completedCutoff)) {
            c.setStatus(VideoCallStatus.COMPLETED);
            c.setCompletedAt(now);
            repo.save(c);
            touched++;
        }
        return touched;
    }


    private VideoCallRequest mustOwnAsTrainee(String callId, String traineeId) {
        VideoCallRequest call = repo.findById(callId)
            .orElseThrow(() -> new ResourceNotFoundException("Call not found"));
        if (!traineeId.equals(call.getTraineeId())) {
            throw new AccessDeniedException("Only the trainee can respond");
        }
        return call;
    }

    private void emitSystemMessage(VideoCallRequest call, String action) {
        Conversation conv = conversationRepo.findById(call.getConversationId()).orElse(null);
        if (conv == null) return;

        Message msg = Message.builder()
            .conversationId(call.getConversationId())
            .senderId(call.getScheduledByUserId())
            .clientMessageId("vcall-" + call.getId() + "-" + action)
            .type(MessageType.SYSTEM)
            .text(humanCopy(call, action))
            .sentAt(Instant.now())
            .systemEvent("video_call:" + call.getId() + ":" + action)
            .build();
        try {
            Message saved = messageRepo.save(msg);
            // Both participants get the frame.
            List<String> recipients = conv.getParticipantIds() == null
                ? List.of()
                : conv.getParticipantIds();
            events.publishEvent(new ChatMessageSentEvent(saved, recipients));
        } catch (Exception ex) {
            log.warn("[video-call] system message persist failed for {}: {}", call.getId(), ex.getMessage());
        }
    }

    private String humanCopy(VideoCallRequest call, String action) {
        return switch (action) {
            case "scheduled" -> call.getStatus() == VideoCallStatus.LIVE
                ? "Video call started — tap to join"
                : "Video call scheduled";
            case "accepted" -> "Video call accepted";
            case "declined" -> "Video call declined";
            case "cancelled" -> "Video call cancelled";
            case "expired" -> "Video call expired";
            default -> "Video call update";
        };
    }

    private String safeCoachingSegment(String coachingId) {
        if (coachingId == null || coachingId.isBlank()) return "x";
        return coachingId.replaceAll("[^A-Za-z0-9]", "");
    }
}
