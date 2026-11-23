import { GoogleGenAI } from '@google/genai';
import type { Part } from '@google/genai';
import {
  QUIZ_PARAMS,
  QUIZ_RESPONSE_SCHEMA,
  QUIZ_SYSTEM_INSTRUCTION,
  SAFETY_SETTINGS,
  TUTOR_PARAMS,
  TUTOR_SYSTEM_INSTRUCTION,
  getModel,
} from './config.js';
import { HttpError, validateQuizPayload } from './validate.js';
import type { QuizPayload, StudyRequest } from './validate.js';

let client: GoogleGenAI | null = null;
/** API key stays server-side (.env); the browser never sees it. */
const getClient = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }));

export const isLive = () => Boolean(process.env.GEMINI_API_KEY);

function buildParts(req: StudyRequest, instruction: string): Part[] {
  const parts: Part[] = [];
  if (req.image) parts.push({ inlineData: { data: req.image.data, mimeType: req.image.mimeType } });
  parts.push({
    text: `${instruction}\n\nLearner level: ${req.level}\n<user_material>\n${req.text || '(see attached image)'}\n</user_material>`,
  });
  return parts;
}

/** Streams the tutor explanation chunk-by-chunk (generateContentStream). */
export async function* streamTutor(req: StudyRequest): AsyncGenerator<string> {
  try {
    const stream = await getClient().models.generateContentStream({
      model: getModel(),
      contents: [{ role: 'user', parts: buildParts(req, 'Teach this to the learner.') }],
      config: { systemInstruction: TUTOR_SYSTEM_INSTRUCTION, safetySettings: SAFETY_SETTINGS, ...TUTOR_PARAMS },
    });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  } catch (err) {
    console.error('Gemini tutor error:', err);
    throw new HttpError(502, 'Failed to process the AI tutor request.');
  }
}

/** Generates a quiz as schema-constrained JSON (responseMimeType + responseSchema). */
export async function generateQuiz(req: StudyRequest): Promise<QuizPayload> {
  let text: string | undefined;
  try {
    const res = await getClient().models.generateContent({
      model: getModel(),
      contents: [
        {
          role: 'user',
          parts: buildParts(
            req,
            `Create a ${req.difficulty} multiple-choice quiz with exactly ${req.count} questions from the material.`,
          ),
        },
      ],
      config: {
        systemInstruction: QUIZ_SYSTEM_INSTRUCTION,
        safetySettings: SAFETY_SETTINGS,
        responseMimeType: 'application/json',
        responseSchema: QUIZ_RESPONSE_SCHEMA,
        ...QUIZ_PARAMS,
      },
    });
    text = res.text;
  } catch (err) {
    console.error('Gemini quiz error:', err);
    throw new HttpError(502, 'Failed to process the quiz generation request.');
  }
  try {
    return validateQuizPayload(JSON.parse(text ?? ''));
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, 'The AI returned malformed JSON. Please try again.');
  }
}
