package com.smartlearn.ar.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ChatMessage DTO representing previous dialogue nodes to preserve AI context.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String role; // "user" or "model" / "assistant"
    private String message;
}
