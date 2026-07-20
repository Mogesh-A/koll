package com.smartlearn.ar.controller;

import com.smartlearn.ar.dto.TutorRequest;
import com.smartlearn.ar.dto.TutorResponse;
import com.smartlearn.ar.service.AnthropicClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Rest Controller exposed at /api/tutor to handle conversational requests from the student workspace.
 */
@RestController
@RequestMapping("/api/tutor")
@CrossOrigin(origins = "*") // Allow requests from any origin during dev
public class TutorController {

    private final AnthropicClient anthropicClient;

    @Autowired
    public TutorController(AnthropicClient anthropicClient) {
        this.anthropicClient = anthropicClient;
    }

    /**
     * Endpoint to analyze and guide students Socratic-style based on their subject area,
     * education level, and active conversation contexts.
     *
     * @param request The complete student configurations & active message
     * @return TutorResponse encapsulating the AI's responsive markdown
     */
    @PostMapping
    public ResponseEntity<TutorResponse> tutorStudent(@RequestBody TutorRequest request) {
        // Fallback for current active message if empty in the list but present as direct prompt
        if (request.getMessage() != null && !request.getMessage().trim().isEmpty() && request.getChatHistory() != null) {
            // Ensure the latest message exists in history if history has been maintained
            boolean exists = request.getChatHistory().stream()
                    .anyMatch(h -> request.getMessage().equals(h.getMessage()));
            if (!exists) {
                // Latest prompt from user
                request.getChatHistory().add(new com.smartlearn.ar.dto.ChatMessage("user", request.getMessage()));
            }
        }

        // Call our AI Service layer to generate responses securely on the server-side
        String responseText = anthropicClient.generateResponse(request);

        // Serialize results into clean structured Response DTO
        TutorResponse response = new TutorResponse(
                responseText,
                request.getSubjectArea(),
                request.getTeachingPersona()
        );

        return ResponseEntity.ok(response);
    }
}
