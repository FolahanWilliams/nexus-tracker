import { VocabDifficulty } from '@/store/useGameStore';

/** Fisher-Yates shuffle — returns a new shuffled copy of the array. */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const DIFFICULTY_COLORS: Record<VocabDifficulty, string> = {
  beginner: 'var(--color-green)',
  intermediate: 'var(--color-blue)',
  advanced: 'var(--color-purple)',
  expert: 'var(--color-orange)',
};

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'NEW', color: 'var(--color-blue)' },
  learning: { label: 'LEARNING', color: 'var(--color-orange)' },
  reviewing: { label: 'REVIEWING', color: 'var(--color-purple)' },
  mastered: { label: 'MASTERED', color: 'var(--color-green)' },
};

export type QuizType =
  | 'multiple_choice' | 'reverse_choice' | 'fill_blank' | 'free_recall' | 'use_in_sentence'
  | 'synonym_match' | 'antonym_match' | 'etymology_drill' | 'contextual_cloze' | 'spelling_challenge'
  | 'sentence_construction' | 'paraphrase_challenge';

export interface QuizQuestion {
  word: string;
  type: QuizType;
  question: string;
  options?: string[];
  correctIndex?: number;
  hint: string;
  /** The correct spelling for spelling_challenge type */
  correctSpelling?: string;
  /** The original sentence to paraphrase (for paraphrase_challenge) */
  originalSentence?: string;
  /** The target word to incorporate (for paraphrase_challenge) */
  targetWord?: string;
}

/** AI grading result for sentence construction and paraphrase challenges */
export interface SentenceGradeResult {
  correct: boolean;
  score: number; // 0-100
  correctUsage: boolean;
  grammar: boolean;
  naturalness: boolean;
  feedback: string;
  improvedVersion?: string;
}
