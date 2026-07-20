package com.smartlearn.ar.service;

import com.smartlearn.ar.dto.ChatMessage;
import com.smartlearn.ar.dto.TutorRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service client communicating securely with Anthropic's Messages API (Claude).
 */
@Service
public class AnthropicClient {

    @Value("${anthropic.api.key:}")
    private String apiKey;

    @Value("${anthropic.api.url:https://api.anthropic.com/v1/messages}")
    private String apiUrl;

    @Value("${anthropic.model:claude-3-5-sonnet-20241022}")
    private String modelName;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateResponse(TutorRequest tutorRequest) {
        // Fallback if no API key is specified
        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("YOUR_ANTHROPIC_API_KEY")) {
            return "Hello " + tutorRequest.getStudentName() + "! I'm your Java Spring Boot AI Tutor. "
                    + "Please configure the 'anthropic.api.key' inside your application.properties "
                    + "file to connect this service to Anthropic's REST API!";
        }

        try {
            // Define standard headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");

            // Formulate the pedagogical system prompt
            String systemInstruction = "You are \"SmartLearn AI\", an elite personalized academic tutor. "
                    + "You are currently tutoring a student named " + tutorRequest.getStudentName() 
                    + ", whose education level is " + tutorRequest.getEducationLevel() 
                    + " and whose primary subject of interest is " + tutorRequest.getSubjectArea() + ". "
                    + "Adjust your vocabulary and detail depth to match their grade. "
                    + "Your teaching persona is set to: " + tutorRequest.getTeachingPersona() + ". "
                    + "Behavioral parameters:\n";

            if ("socratic".equalsIgnoreCase(tutorRequest.getTeachingPersona())) {
                systemInstruction += "- DO NOT give answers directly. Guide the student with Socratic questioning.\n"
                        + "- Ask brief, incremental questions to help them uncover the answer themselves.\n"
                        + "- Acknowledge their logical correct steps and gently challenge flaws with questions.";
            } else if ("practical".equalsIgnoreCase(tutorRequest.getTeachingPersona())) {
                systemInstruction += "- Focus heavily on practical, concise explanations.\n"
                        + "- Provide direct, thoroughly commented clean code blocks immediately.\n"
                        + "- Skip unnecessary theoretical background and offer real-world examples.";
            } else if ("science".equalsIgnoreCase(tutorRequest.getTeachingPersona())) {
                systemInstruction += "- Provide rigorous, detailed scientific or mathematical breakdowns.\n"
                        + "- Define formulas, steps, and theoretical foundations explicitly.";
            } else { // supportive
                systemInstruction += "- Use highly warm, casual, and supportive tone.\n"
                        + "- Boost confidence and translate concepts into fun, easy everyday analogies.";
            }

            // Construct payload messages list
            List<Map<String, Object>> messagesPayload = new ArrayList<>();
            
            // Map past conversations if present
            if (tutorRequest.getChatHistory() != null) {
                for (ChatMessage historyMsg : tutorRequest.getChatHistory()) {
                    Map<String, Object> msgMap = new HashMap<>();
                    // Claude API expects "assistant" instead of "model"
                    String role = "user".equalsIgnoreCase(historyMsg.getRole()) ? "user" : "assistant";
                    msgMap.put("role", role);
                    msgMap.put("content", historyMsg.getMessage());
                    messagesPayload.add(msgMap);
                }
            } else {
                // If no history, add current user prompt
                Map<String, Object> currentMsg = new HashMap<>();
                currentMsg.put("role", "user");
                currentMsg.put("content", tutorRequest.getMessage());
                messagesPayload.add(currentMsg);
            }

            // Construct full request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelName);
            requestBody.put("system", systemInstruction);
            requestBody.put("max_tokens", 1024);
            requestBody.put("messages", messagesPayload);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // Execute POST request to Anthropic Messages endpoint
            ResponseEntity<Map> responseEntity = restTemplate.exchange(
                    apiUrl, HttpMethod.POST, entity, Map.class
            );

            if (responseEntity.getStatusCode() == HttpStatus.OK && responseEntity.getBody() != null) {
                Map<String, Object> responseBody = responseEntity.getBody();
                List<Map<String, Object>> contentList = (List<Map<String, Object>>) responseBody.get("content");
                if (contentList != null && !contentList.isEmpty()) {
                    return (String) contentList.get(0).get("text");
                }
            }

            return "Received an unexpected empty response payload from the AI service.";

        } catch (Exception e) {
            return "⚠️ **Spring Boot Backend Error**: Encountered an issue connecting to the AI REST client: " + e.getMessage();
        }
    }
}
