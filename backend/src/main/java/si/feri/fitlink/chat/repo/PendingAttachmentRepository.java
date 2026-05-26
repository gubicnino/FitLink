package si.feri.fitlink.chat.repo;

import org.springframework.data.mongodb.repository.MongoRepository;

import si.feri.fitlink.chat.domain.PendingAttachment;

public interface PendingAttachmentRepository extends MongoRepository<PendingAttachment, String> {
}
