import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static frontend files from public, dist, and root
const publicDir = path.join(process.cwd(), 'public');
const distDir = path.join(process.cwd(), 'dist');

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}
app.use(express.static(process.cwd()));

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

// Unified Llama 3 / Gemini assistant responder
async function callLlama3Model(systemInstruction: string, messages: any[]): Promise<{ text: string; modelUsed: string }> {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (groqApiKey && groqApiKey.trim() !== "") {
    try {
      const groqPayload = {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages
        ],
        temperature: 0.7,
      };

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(groqPayload)
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json() as any;
        const replyText = groqData?.choices?.[0]?.message?.content;
        if (replyText) {
          return {
            text: replyText,
            modelUsed: "Meta Llama 3.1 (Groq API)"
          };
        }
      } else {
        const errText = await groqResponse.text();
        console.error('Groq API error response:', groqResponse.status, errText);
      }
    } catch (err) {
      console.error('Error calling Groq API, falling back to Gemini Llama 3 emulation:', err);
    }
  }

  // Fallback Llama 3 Emulation via Gemini
  if (!ai) {
    throw new Error('AI Service has not been initialized. Please configure GEMINI_API_KEY.');
  }

  const enhancedInstruction = `You are emulating the Meta Llama 3 model (specifically Meta-Llama-3-8B-Instruct). 
You MUST adopt Llama 3's conversational characteristics: extremely helpful, highly articulate, technically clear, and swift.
Introduce yourself, structure your responses, and converse as Llama 3.

Here are the study context and core instructions for your tutoring role:
${systemInstruction}`;

  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content || '' }]
  }));

  const geminiResponse = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: contents,
    config: {
      systemInstruction: enhancedInstruction,
      temperature: 0.7,
    },
  });

  return {
    text: geminiResponse.text || "I am Llama 3. I couldn't formulate a response right now. Let's try again!",
    modelUsed: "Meta Llama 3 (Gemini Emulation)"
  };
}

// Unified Llama 3 / Gemini quiz generator
async function callLlama3Quiz(systemInstruction: string, topic: string): Promise<any> {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (groqApiKey && groqApiKey.trim() !== "") {
    try {
      const groqPayload = {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Generate a 5-question multiple choice quiz on the topic: "${topic}"` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      };

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(groqPayload)
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json() as any;
        const content = groqData?.choices?.[0]?.message?.content;
        if (content) {
          return JSON.parse(content);
        }
      }
    } catch (err) {
      console.error('Error generating quiz from Groq, falling back to Gemini:', err);
    }
  }

  // Fallback to Gemini
  if (!ai) {
    throw new Error('AI Service has not been initialized. Please configure GEMINI_API_KEY.');
  }

  const geminiResponse = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Generate a 5-question multiple choice quiz on the topic: "${topic}"` }] }],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });

  const quizText = geminiResponse.text || "{}";
  return JSON.parse(quizText);
}

// REST API endpoint: POST /api/tutor
app.post('/api/tutor', async (req, res) => {
  const { studentName, educationLevel, subjectArea, teachingPersona, message, chatHistory, model } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message field is required.' });
  }

  const selectedModel = model || 'llama3';

  // Fallback if API keys are not configured yet
  if (!ai && !process.env.GROQ_API_KEY) {
    return res.json({
      response: `Hello **${studentName || 'Student'}**! I'm ready to tutor you. However, neither the \`GROQ_API_KEY\` nor \`GEMINI_API_KEY\` is configured in the AI Studio environment yet. Please add your API Key in the **Settings > Secrets** panel in the AI Studio UI to start chatting in real-time!`,
      modelUsed: "None"
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

    // 2. Prepare conversation messages
    const messages: any[] = [];
    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      const relevantHistory = chatHistory.slice(-15);
      relevantHistory.forEach((msg: any) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.message
        });
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    // 3. Complete request
    if (selectedModel === 'gemini') {
      if (!ai) {
        throw new Error('GEMINI_API_KEY is not configured.');
      }
      const contents = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({
        response: geminiResponse.text || "Unable to formulate a response.",
        subjectArea: subjectArea,
        teachingPersona: teachingPersona,
        modelUsed: "Gemini 1.5 Flash"
      });
    } else {
      // Default to Llama 3
      const result = await callLlama3Model(systemInstruction, messages);
      return res.json({
        response: result.text,
        subjectArea: subjectArea,
        teachingPersona: teachingPersona,
        modelUsed: result.modelUsed
      });
    }

  } catch (error: any) {
    console.error('Error contacting AI service:', error);
    return res.status(500).json({
      error: 'Failed to contact AI service.',
      details: error.message
    });
  }
});

// REST API endpoint: POST /api/quiz
app.post('/api/quiz', async (req, res) => {
  const { educationLevel, subjectArea, topic, model } = req.body;

  const resolvedTopic = topic || subjectArea || 'General Science';
  const selectedModel = model || 'llama3';

  // Fallback if API keys are not configured yet
  if (!ai && !process.env.GROQ_API_KEY) {
    return res.json({
      title: `${resolvedTopic} Quiz (Preview Mode)`,
      topic: resolvedTopic,
      isFallback: true,
      questions: [
        {
          id: 1,
          question: `What is the fundamental building block of study in ${resolvedTopic}?`,
          options: ["Core Principles & Concepts", "Irrelevant Random Details", "Secondary Assumptions", "Outdated Hypotheses"],
          correctAnswer: 0,
          explanation: `In any academic domain like ${resolvedTopic}, mastering core principles and concepts forms the foundation for all advanced understanding.`
        },
        {
          id: 2,
          question: `Which approach is most effective for deep learning in ${resolvedTopic}?`,
          options: ["Passive reading without review", "Active recall, practice questions, and peer teaching", "Cramming the night before an exam", "Relying purely on memorization"],
          correctAnswer: 1,
          explanation: "Active recall and practice testing (like this quiz!) help reinforce neural connections, ensuring robust long-term retention of subject matter."
        },
        {
          id: 3,
          question: `Which of these is a typical challenge when specializing in ${resolvedTopic}?`,
          options: ["Managing high information density & jargon", "Finding any material to study", "There is absolutely no math involved", "The field never changes"],
          correctAnswer: 0,
          explanation: `As students progress in ${resolvedTopic}, handling advanced terminology, dense structural proofs, or professional vocabulary is the primary cognitive hurdle.`
        },
        {
          id: 4,
          question: `Why is continuous self-assessment critical in ${resolvedTopic}?`,
          options: ["It identifies knowledge gaps early and improves metacognition", "It guarantees 100% test scores with zero effort", "It is required by law", "It has no positive cognitive effect"],
          correctAnswer: 0,
          explanation: "Self-assessment allows learners to evaluate their understanding objectively, correcting misconceptions before they harden into habit."
        },
        {
          id: 5,
          question: `To apply concepts of ${resolvedTopic} in a real-world setting, what is typically required?`,
          options: ["Theoretical knowledge alone", "Combining theoretical models with practical experimentation", "Ignoring established frameworks", "Avoiding peer feedback"],
          correctAnswer: 1,
          explanation: "True expertise combines theoretical comprehension with experiential practice, enabling the creative application of concepts to novel problems."
        }
      ]
    });
  }

  try {
    const systemInstruction = `You are "SmartLearn AI", an elite academic assessment creator running on Llama 3.
Generate a high-quality interactive multiple-choice quiz based on the student's learning profile:
Education Level: ${educationLevel || 'Undergraduate'}
Primary Subject: ${subjectArea || 'Computer Science'}
Specific Quiz Topic: ${resolvedTopic}

The quiz must contain exactly 5 high-quality, conceptually rigorous multiple-choice questions suitable for a student at the ${educationLevel || 'Undergraduate'} level.
Each question must have exactly 4 plausible options, and one clearly correct option (specified as 0-indexed integer: 0, 1, 2, or 3).
Each question must also include a clear, educational, and concise explanation of why the correct option is right and why the others are incorrect.

You MUST respond ONLY with a raw JSON object conforming to this structure:
{
  "title": "A highly engaging title for the quiz",
  "topic": "The main topic or subject",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed pedagogical explanation."
    }
  ]
}

Ensure the output is 100% valid JSON and does not contain any wrapping codeblocks or prefix/suffix texts.`;

    const quizData = await callLlama3Quiz(systemInstruction, resolvedTopic);
    return res.json(quizData);

  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return res.status(500).json({
      error: 'Failed to generate quiz.',
      details: error.message
    });
  }
});

// Helper to serve HTML files reliably across environments
function serveHtmlFile(filename: string, res: express.Response) {
  const fileInPublic = path.join(publicDir, filename);
  if (fs.existsSync(fileInPublic)) {
    return res.sendFile(fileInPublic);
  }
  const fileInDist = path.join(distDir, filename);
  if (fs.existsSync(fileInDist)) {
    return res.sendFile(fileInDist);
  }
  const fileInRoot = path.join(process.cwd(), filename);
  if (fs.existsSync(fileInRoot)) {
    return res.sendFile(fileInRoot);
  }
  return res.status(404).send('Page not found');
}

// Serve static HTML files directly on routing
app.get('/', (req, res) => serveHtmlFile('index.html', res));
app.get('/index.html', (req, res) => serveHtmlFile('index.html', res));
app.get('/Profile.html', (req, res) => serveHtmlFile('Profile.html', res));
app.get('/Calculator.html', (req, res) => serveHtmlFile('Calculator.html', res));
app.get('/Quiz.html', (req, res) => serveHtmlFile('Quiz.html', res));

// Default fallback route
app.get('*', (req, res) => serveHtmlFile('index.html', res));

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`SmartLearn Full-Stack Node Server running on http://0.0.0.0:${PORT}`);
});
