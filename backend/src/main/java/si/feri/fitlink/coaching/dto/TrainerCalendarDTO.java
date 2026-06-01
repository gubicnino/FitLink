package si.feri.fitlink.coaching.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainerCalendarDTO {
    private String date;
    private int checkInsCount;
    private int weightLogsCount;
    private int activeClients;
    private List<String> overdueClientNames;
}
