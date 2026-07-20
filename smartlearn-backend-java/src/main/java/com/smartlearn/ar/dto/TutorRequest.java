package com.smartlearn.ar.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * TutorRequest DTO carrying the full student customization bundle and active prompt.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TutorRequest {
    private String studentName;
    private String educationLevel;
    private String subjectArea;
    private String teachingPersona;
    private String message;
    private List<ChatMessage> chatHistory;
}
