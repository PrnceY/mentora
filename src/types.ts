export type Level = 'high-school' | 'college' | 'advanced';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ImageInput {
  data: string;
  mimeType: string;
}

export interface StudyPayload {
  text: string;
  level: Level;
  difficulty: Difficulty;
  count: number;
  image?: ImageInput;
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

export interface Health {
  mode: 'live' | 'demo';
  model: string | null;
}
