export type Level = 'high-school' | 'college' | 'advanced';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ImageInput {
  data: string; // base64, no data: prefix
  mimeType: string;
}

export interface StudyRequest {
  text: string;
  level: Level;
  difficulty: Difficulty;
  count: number;
  image?: ImageInput;
}

export const MAX_TEXT = 8000;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB decoded (Vercel caps request bodies at 4.5 MB)
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Validates and normalises the request body before any API call is made. */
export function parseStudyRequest(body: unknown): StudyRequest {
  const b = (body ?? {}) as Record<string, any>;
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const level: Level = ['high-school', 'college', 'advanced'].includes(b.level) ? b.level : 'college';
  const difficulty: Difficulty = ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'medium';
  const count = Math.min(10, Math.max(3, Number.isInteger(b.count) ? b.count : 5));

  if (text.length > MAX_TEXT) throw new HttpError(400, `Text is too long (max ${MAX_TEXT} characters).`);

  let image: ImageInput | undefined;
  if (b.image) {
    const { data, mimeType } = b.image as Partial<ImageInput>;
    if (typeof data !== 'string' || typeof mimeType !== 'string') throw new HttpError(400, 'Malformed image payload.');
    if (!ALLOWED_MIME.includes(mimeType)) throw new HttpError(400, 'Only JPEG, PNG or WebP images are supported.');
    const bytes = Math.floor((data.length * 3) / 4);
    if (bytes > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image is larger than 10 MB.');
    image = { data, mimeType };
  }

  if (!text && !image) throw new HttpError(400, 'Provide a topic, notes, or an image of your notes.');
  return { text, level, difficulty, count, image };
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  steps: string[];
}

export interface QuizPayload {
  status: 'ok' | 'out_of_scope' | 'unreadable_input';
  refusal_reason?: string;
  topic?: string;
  difficulty?: Difficulty;
  questions: QuizQuestion[];
  study_tips?: string[];
}

/** Defence-in-depth: never trust the model's JSON, even with a response schema. */
export function validateQuizPayload(raw: unknown): QuizPayload {
  const q = raw as Partial<QuizPayload> | null;
  if (!q || typeof q !== 'object' || !['ok', 'out_of_scope', 'unreadable_input'].includes(q.status as string)) {
    throw new HttpError(502, 'The AI returned an unexpected response. Please try again.');
  }
  if (q.status !== 'ok') {
    return { status: q.status!, refusal_reason: String(q.refusal_reason ?? 'Request could not be processed.'), questions: [] };
  }
  const questions = Array.isArray(q.questions) ? q.questions : [];
  const valid = questions.filter(
    (x) =>
      typeof x?.question === 'string' &&
      Array.isArray(x.options) &&
      x.options.length === 4 &&
      x.options.every((o) => typeof o === 'string') &&
      Number.isInteger(x.correct_index) &&
      x.correct_index >= 0 &&
      x.correct_index <= 3,
  ).map((x) => ({
    question: x.question,
    options: x.options,
    correct_index: x.correct_index,
    explanation: String(x.explanation ?? ''),
    steps: Array.isArray(x.steps) ? x.steps.map(String) : [],
  }));
  if (valid.length === 0) throw new HttpError(502, 'The AI did not return a usable quiz. Please try again.');
  return {
    status: 'ok',
    topic: q.topic ? String(q.topic) : 'Practice Quiz',
    difficulty: q.difficulty,
    questions: valid,
    study_tips: Array.isArray(q.study_tips) ? q.study_tips.map(String) : [],
  };
}
