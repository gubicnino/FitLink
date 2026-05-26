package si.feri.fitlink.chat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import si.feri.fitlink.auth.AuthPrincipal;
import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.domain.ConversationParticipant;
import si.feri.fitlink.chat.domain.Message;
import si.feri.fitlink.chat.dto.ChatDtos;
import si.feri.fitlink.chat.dto.ChatMapper;
import si.feri.fitlink.chat.service.AttachmentService;
import si.feri.fitlink.chat.service.ChatService;
import si.feri.fitlink.user.User;
import si.feri.fitlink.user.UserRepository;

/**
 * Chat REST API.
 * All "userId" values on the wire are Firebase UIDs.
 *
 *   GET    /api/chat/conversations         my conversations
 *   GET    /api/chat/conversations/{id}            conversation + participants
 *   PATCH  /api/chat/conversations/{id}/muted    set mute
 *   PATCH  /api/chat/conversations/{id}/archived     set archived
 *
 *   GET    /api/chat/conversations/{id}/messages     paginated (before, limit)
 *   GET    /api/chat/conversations/{id}/messages/since  reconnect-sync
 *   POST   /api/chat/conversations/{id}/messages     send text/attachment
 *   PATCH  /api/chat/conversations/{id}/read        mark read up to messageId
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final AttachmentService attachmentService;
    private final UserRepository userRepository;


    @GetMapping("/conversations")
    public List<ChatDtos.ConversationResponse> myConversations(@AuthenticationPrincipal AuthPrincipal principal) {
        List<Conversation> convs = chatService.listMyConversations(principal.uid());
        Map<String, Long> unread = chatService.unreadCounts(principal.uid());
        List<ChatDtos.ConversationResponse> out = new ArrayList<>(convs.size());
        for (Conversation c : convs) {
            out.add(toConversationDto(c, principal.uid(), unread.getOrDefault(c.getId(), 0L)));
        }
        return out;
    }

    @GetMapping("/conversations/{id}")
    public ChatDtos.ConversationResponse getConversation(
        @PathVariable String id,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Conversation conv = chatService.getConversationForUser(id, principal.uid());
        long unread = chatService.unreadCounts(principal.uid()).getOrDefault(conv.getId(), 0L);
        return toConversationDto(conv, principal.uid(), unread);
    }

    @PatchMapping("/conversations/{id}/muted")
    public ChatDtos.ConversationResponse setMuted(
        @PathVariable String id,
        @AuthenticationPrincipal AuthPrincipal principal,
        @Valid @RequestBody ChatDtos.SetMutedRequest body
    ) {
        Conversation conv = chatService.setMuted(id, principal.uid(), body.muted());
        return toConversationDto(conv, principal.uid(), 0);
    }

    @PatchMapping("/conversations/{id}/archived")
    public ChatDtos.ConversationResponse setArchived(
        @PathVariable String id,
        @AuthenticationPrincipal AuthPrincipal principal,
        @Valid @RequestBody ChatDtos.SetArchivedRequest body
    ) {
        Conversation conv = chatService.setArchived(id, principal.uid(), body.archived());
        return toConversationDto(conv, principal.uid(), 0);
    }


    @GetMapping("/conversations/{id}/messages")
    public List<ChatDtos.MessageResponse> listMessages(
        @PathVariable String id,
        @AuthenticationPrincipal AuthPrincipal principal,
        @RequestParam(required = false) Instant before,
        @RequestParam(defaultValue = "50") int limit
    ) {
        return chatService.listMessages(id, principal.uid(), before, limit).stream()
            .map(m -> ChatMapper.toMessageResponse(m, this::attachmentUrl)).toList();
    }

    @GetMapping("/conversations/{id}/messages/since")
    public List<ChatDtos.MessageResponse> messagesSince(
        @PathVariable String id,
        @AuthenticationPrincipal AuthPrincipal principal,
        @RequestParam Instant since
    ) {
        return chatService.listMessagesSince(id, principal.uid(), since).stream()
            .map(m -> ChatMapper.toMessageResponse(m, this::attachmentUrl)).toList();
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ChatDtos.MessageResponse> sendMessage(
        @PathVariable String id,
        @AuthenticationPrincipal AuthPrincipal principal,
        @Valid @RequestBody ChatDtos.SendMessageRequest body
    ) {
        var attachments = body.attachments() == null ? List.<si.feri.fitlink.chat.domain.Attachment>of()
            : body.attachments().stream()
                .map(ref -> attachmentService.resolveOrThrow(ref.attachmentId(), principal.uid()))
                .toList();

        Message saved = chatService.sendMessage(
            id, principal.uid(), body.clientMessageId(), body.text(), attachments
        );
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ChatMapper.toMessageResponse(saved, this::attachmentUrl));
    }

    @PatchMapping("/conversations/{id}/read")
    public ResponseEntity<Void> markRead(
        @PathVariable String id,
        @AuthenticationPrincipal AuthPrincipal principal,
        @Valid @RequestBody ChatDtos.MarkReadRequest body
    ) {
        chatService.markRead(id, principal.uid(), body.messageId());
        return ResponseEntity.noContent().build();
    }


    private ChatDtos.ConversationResponse toConversationDto(
        Conversation conv, String viewerUserId, long unreadCount
    ) {
        List<ConversationParticipant> participants = chatService.listParticipants(conv.getId());
        List<ChatDtos.ParticipantSummary> summaries = new ArrayList<>(participants.size());
        boolean viewerMuted = false;
        for (ConversationParticipant p : participants) {

            User u = userRepository.findByFirebaseUid(p.getUserId())
                .or(() -> userRepository.findById(p.getUserId()))
                .orElse(null);
            summaries.add(new ChatDtos.ParticipantSummary(
                p.getUserId(),
                u != null ? u.getDisplayName() : null,
                p.getRole(),
                p.getLastReadAt(),
                p.getLastReadMessageId()
            ));
            if (p.getUserId().equals(viewerUserId)) {
                viewerMuted = p.isMuted();
            }
        }
        ChatService.ReadOnlyState ro = chatService.resolveReadOnlyState(conv);
        return new ChatDtos.ConversationResponse(
            conv.getId(),
            conv.getType() == null ? null : conv.getType().name(),
            conv.getCoachingId(),
            summaries,
            conv.getCreatedAt(),
            conv.getUpdatedAt(),
            ChatMapper.toLastMessageDto(conv.getLastMessage()),
            conv.isArchived(),
            viewerMuted,
            unreadCount,
            ro.readOnly(),
            ro.reason()
        );
    }

    private String attachmentUrl(String attachmentId, boolean thumbnail) {
        return "/api/chat/attachments/" + attachmentId + (thumbnail ? "/thumbnail" : "");
    }
}
