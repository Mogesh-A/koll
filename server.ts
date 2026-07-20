import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000; // Hardcoded container port required by proxy

app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(process.cwd(), 'public')));

// Initialize Gemini client (server-side only)
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('Warning: GEMINI_API_KEY is not configured or placeholder detected in environment variables.');
}

// REST API endpoint: POST /api/tutor
app.post('/api/tutor', async (req, res) => {
  const { studentName, educationLevel, subjectArea, teachingPersona, message, chatHistory } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message field is required.' });
  }

  // Fallback if API key is not configured yet
  if (!ai) {
    return res.json({
      response: `Hello **${studentName || 'Student'}**! I'm ready to tutor you. However, the \`GEMINI_API_KEY\` secret is not configured in the AI Studio environment yet. Please add your Gemini API Key in the **Settings > Secrets** panel in the AI Studio UI to start chatting in real-time!`
    });
  }

  try {
    // 1. Formulate dynamic system instructions based on teaching persona and profile
    let systemInstruction = `You are "SmartLearn AI", an elite personalized academic tutor.
You are currently tutoring a student named ${studentName || 'Student'}, whose education level is ${educationLevel || 'Undergraduate'} and whose primary field of interest is ${subjectArea || 'Computer Science'}.
Adjust your language density, vocabulary, and depth to match their education level (${educationLevel || 'Undergraduate'}).

Your teaching persona is strictly set to "${teachingPersona || 'socratic'}". Adhere to these behavioral rules:`;

    if (teachingPersona === 'socratic') {
      systemInstruction += `
- Never give the answers directly. Always guide the student with thoughtful, incremental Socratic questions.
- Encourage them to think through the problem and break it down themselves.
- Acknowledge their correct steps and gently point out logical flaws with a guiding question.`;
    } else if (teachingPersona === 'practical') {
      systemInstruction += `
- Focus strictly on practical, direct applications, real-world usefulness, and coding.
- Provide clean, commented, and standard-compliant code snippets immediately when asked about programming.
- Give highly concise, actionable explanations with immediate examples.`;
    } else if (teachingPersona === 'science') {
      systemInstruction += `
- Provide academic, deep, scientific breakdowns.
- Include mathematical or technical definitions, formulas, and rigorous step-by-step logic.
- Break down physical, mathematical, or scientific systems with high technical clarity.`;
    } else { // supportive / companion
      systemInstruction += `
- Be incredibly supportive, friendly, encouraging, and casual.
- Use warm, empathetic language. Break down complex topics into simple, relatable everyday analogies.
- Boost the student's confidence at every opportunity.`;
    }

    systemInstruction += `\n\nFormat your responses beautifully in Markdown. Use code blocks with language syntax highlights for code, use headers for sections, and list items clearly. Keep paragraphs concise.`;

    // 2. Prepare conversation contents
    // Convert incoming chatHistory into Gemini API's expected contents array format
    const contents: any[] = [];

    if (chatHistory && Array.isArray(chatHistory)) {
      // Keep up to last 15 messages for context length optimization
      const relevantHistory = chatHistory.slice(-15);
      relevantHistory.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.message }]
        });
      });
    } else {
      // Fallback if no history was passed, just send the current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });
    }

    // 3. Request completion from Gemini API (using recommended gemini-3.5-flash for standard chats)
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = geminiResponse.text || "I was unable to formulate a learning response. Let's try rephrasing your topic!";

    // 4. Return matching Spring Boot TutorResponse DTO
    return res.json({
      response: replyText,
      subjectArea: subjectArea,
      teachingPersona: teachingPersona
    });

  } catch (error: any) {
    console.error('Error contacting Gemini API:', error);
    return res.status(500).json({
      error: 'Failed to contact AI service.',
      details: error.message
    });
  }
});

// Serve static HTML files directly on routing
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.get('/Profile.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'Profile.html'));
});

app.get('/Calculator.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'Calculator.html'));
});

// Default route redirecting to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartLearn Full-Stack Node Dev Server running on http://0.0.0.0:${PORT}`);
});
