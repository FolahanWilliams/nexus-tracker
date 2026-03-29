import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput, sanitizeStringArray } from '@/lib/sanitize';
import { GAUNTLET_BONUS_SECONDS } from '@/lib/arenaConstants';
import type { ArenaDifficulty } from '@/store/types';

interface GauntletRequest {
    action: 'generate_puzzles' | 'validate_answer';
    difficulty?: ArenaDifficulty;
    count?: number;
    vocabWords?: string[];
    puzzlePrompt?: string;
    correctAnswer?: string;
    playerAnswer?: string;
}

const MOCK_PUZZLES = [
    { type: 'anagram', prompt: 'Unscramble: LEPPRA', hint: 'A type of fruit or tech company', answer: 'APPLE', difficulty: 'easy', bonusSeconds: 5 },
    { type: 'crossword_clue', prompt: 'A celestial body that orbits a star (6 letters)', hint: 'Earth is one', answer: 'PLANET', difficulty: 'easy', bonusSeconds: 5 },
    { type: 'anagram', prompt: 'Unscramble: ANETLP', hint: 'A world in space', answer: 'PLANET', difficulty: 'easy', bonusSeconds: 5 },
    { type: 'crossword_clue', prompt: 'The opposite of artificial (7 letters)', hint: 'Organic', answer: 'NATURAL', difficulty: 'medium', bonusSeconds: 3 },
    { type: 'word_chain', prompt: 'Start with MOON. Name a word starting with N that relates to nighttime.', hint: 'Opposite of day', answer: 'NIGHT', difficulty: 'medium', bonusSeconds: 3 },
    { type: 'cryptogram', prompt: 'Decode: UIF RVJDL CSPXO GPY (each letter shifted by 1)', hint: 'A famous pangram fragment', answer: 'THE QUICK BROWN FOX', difficulty: 'hard', bonusSeconds: 2 },
    { type: 'anagram', prompt: 'Unscramble: GNITIRW', hint: 'Putting words on paper', answer: 'WRITING', difficulty: 'medium', bonusSeconds: 3 },
    { type: 'crossword_clue', prompt: 'To understand or grasp mentally (10 letters)', hint: 'Starts with C', answer: 'COMPREHEND', difficulty: 'hard', bonusSeconds: 2 },
];

export const POST = withAuth(async (request) => {
    try {
        const raw = await request.json();
        if (raw.playerAnswer) raw.playerAnswer = sanitizePromptInput(raw.playerAnswer, 500);
        if (raw.vocabWords) raw.vocabWords = sanitizeStringArray(raw.vocabWords, 15, 100);
        const body = raw as GauntletRequest;

        if (body.action === 'validate_answer') {
            const correct = body.correctAnswer?.toUpperCase().trim();
            const player = body.playerAnswer?.toUpperCase().trim();
            if (!correct || !player) {
                return NextResponse.json({ correct: false, feedback: 'No answer provided.' });
            }

            // Simple exact match first
            if (player === correct) {
                return NextResponse.json({ correct: true, feedback: 'Correct!' });
            }

            // For close matches, use AI
            const mockResp = hasApiKeyOrMock({ correct: player === correct, feedback: player === correct ? 'Correct!' : `The answer was: ${correct}` });
            if (mockResp) return mockResp;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `The puzzle answer is: "${correct}"
The player answered: "${player}"
The puzzle prompt was: "${sanitizePromptInput(body.puzzlePrompt || '', 500)}"

Is the player's answer correct? Accept reasonable synonyms, alternate spellings, or close variations.
Output ONLY valid JSON: { "correct": true|false, "feedback": "brief 1-sentence feedback" }`
            );
            const parsed = extractJSON(result.response.text()) as { correct: boolean; feedback: string };
            return NextResponse.json(parsed);
        }

        if (body.action === 'generate_puzzles') {
            const count = Math.min(body.count || 8, 15);
            const difficulty = body.difficulty || 'medium';

            const mockResp = hasApiKeyOrMock({
                puzzles: MOCK_PUZZLES.slice(0, count).map((p, i) => ({ ...p, id: `mock-${i}` })),
            });
            if (mockResp) return mockResp;

            const vocabHint = body.vocabWords?.length
                ? `\nTry to use some of these words as puzzle answers when possible: ${body.vocabWords.join(', ')}`
                : '';

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `Generate ${count} word puzzles for a timed gauntlet game. Difficulty: ${difficulty}.
Mix of types: anagram, word_chain, crossword_clue, cryptogram.${vocabHint}

For anagrams: scramble the letters of a word and ask the player to unscramble it.
For word_chain: give a starting word and ask for a connected word.
For crossword_clue: give a definition/clue and letter count.
For cryptogram: give an encoded sentence with a simple cipher.

Each puzzle needs a clear prompt, optional hint, the correct answer (single word or short phrase), difficulty, and bonus seconds (easy: ${GAUNTLET_BONUS_SECONDS.easy}, medium: ${GAUNTLET_BONUS_SECONDS.medium}, hard: ${GAUNTLET_BONUS_SECONDS.hard}).

Output ONLY valid JSON: { "puzzles": [{ "type": "anagram|word_chain|crossword_clue|cryptogram", "prompt": "...", "hint": "...", "answer": "...", "difficulty": "easy|medium|hard", "bonusSeconds": N }] }`
            );

            const parsed = extractJSON(result.response.text()) as { puzzles: Array<Record<string, unknown>> };
            const puzzles = (parsed.puzzles || []).map((p, i) => ({
                id: crypto.randomUUID(),
                type: String(p.type || 'anagram'),
                prompt: String(p.prompt || ''),
                hint: p.hint ? String(p.hint) : undefined,
                answer: String(p.answer || ''),
                difficulty: String(p.difficulty || difficulty) as ArenaDifficulty,
                bonusSeconds: Number(p.bonusSeconds) || GAUNTLET_BONUS_SECONDS[difficulty],
            }));

            return NextResponse.json({ puzzles });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({
            puzzles: MOCK_PUZZLES.slice(0, 8).map((p, i) => ({ ...p, id: `mock-${i}` })),
            isMock: true,
            error: 'AI unavailable',
        }, { status: 500 });
    }
}, { rateLimitMax: 30 });
