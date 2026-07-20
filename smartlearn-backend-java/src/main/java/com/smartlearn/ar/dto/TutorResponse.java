package com.smartlearn.ar.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * TutorResponse DTO representing the serialized AI Socratic lesson text sent back to the student.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TutorResponse {
    private String response;
    private String subjectArea;
    private String teachingPersona;
}
