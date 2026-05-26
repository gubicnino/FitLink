package si.feri.fitlink.chat.service;

import java.util.Optional;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import si.feri.fitlink.chat.domain.Conversation;
import si.feri.fitlink.chat.repo.ConversationRepository;
import si.feri.fitlink.coaching.Coaching;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationLifecycleService {

    private final ConversationRepository conversationRepo;
    private final ChatService chatService;

    /** FEJST POMEMBNO KA JE TO IDEMPOTENTNO, SEPRAVI SE LEKO ZOVEJ KELKOKRAT SE SCEJ -> SAME OUTPUT */
    public Conversation onCoachingActivated(Coaching coaching) {
        Optional<Conversation> existing = conversationRepo.findFirstByCoachingId(coaching.getId());
        if (existing.isPresent()) {
            log.debug("Conversation already exists for coachingId={}", coaching.getId());
            return existing.get();
        }
        Conversation conv = chatService.createDirectConversation(
            coaching.getId(),
            coaching.getTraineeId(),
            coaching.getTrainerId()
        );
        log.info("Created chat conversation {} for coaching {}", conv.getId(), coaching.getId());
        return conv;
    }
}
