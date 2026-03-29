import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput, sanitizeStringArray } from '@/lib/sanitize';
import type { ArenaDifficulty, DetectiveRank } from '@/store/types';

interface MysteryRequest {
    action: 'generate_mystery' | 'validate_answer';
    difficulty?: ArenaDifficulty;
    detectiveRank?: DetectiveRank;
    vocabWords?: string[];
    riddle?: string;
    correctAnswer?: string;
    playerAnswer?: string;
}

const MOCK_MYSTERY = {
    title: 'The Vanishing Vocabulary',
    narrative: 'A dusty letter arrives at the guild hall, sealed with a cipher. Words have been disappearing from the Great Library, and only a sharp mind can track down the lexical thief.',
    steps: [
        {
            riddle: 'I have cities but no houses, forests but no trees, and water but no fish. What am I?',
            hint1: 'You might find me on a desk.',
            hint2: 'I show you the world in miniature.',
            hint3: 'Cartographers make me.',
            answer: 'MAP',
            clueRevealed: 'The map has a red circle around the old clocktower.',
        },
        {
            riddle: 'The more you take, the more you leave behind. What am I?',
            hint1: 'You leave them everywhere you go.',
            hint2: 'They can be found in sand or snow.',
            hint3: 'Your shoes make them.',
            answer: 'FOOTSTEPS',
            clueRevealed: 'The footsteps lead to a hidden bookshelf.',
        },
        {
            riddle: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?',
            hint1: 'You might hear me in the mountains.',
            hint2: 'I repeat what you say.',
            hint3: 'I am a reflection of sound.',
            answer: 'ECHO',
            clueRevealed: 'The echo reveals the thief was the librarian\'s shadow all along!',
        },
    ],
};

export const POST = withAuth(async (request) => {
    try {
        const raw = await request.json();
        if (raw.playerAnswer) raw.playerAnswer = sanitizePromptInput(raw.playerAnswer, 500);
        if (raw.riddle) raw.riddle = sanitizePromptInput(raw.riddle, 1000);
        if (raw.correctAnswer) raw.correctAnswer = sanitizePromptInput(raw.correctAnswer, 200);
        if (raw.vocabWords) raw.vocabWords = sanitizeStringArray(raw.vocabWords, 15, 100);
        const body = raw as MysteryRequest;

        if (body.action === 'validate_answer') {
            const correct = body.correctAnswer?.toUpperCase().trim();
            const player = body.playerAnswer?.toUpperCase().trim();
            if (!correct || !player) {
                return NextResponse.json({ correct: false, feedback: 'No answer provided.' });
            }

            if (player === correct) {
                return NextResponse.json({ correct: true, feedback: 'Brilliant deduction!' });
            }

            const mockResp = hasApiKeyOrMock({
                correct: player === correct,
                feedback: player === correct ? 'Brilliant deduction!' : 'Not quite. Try thinking about it differently.',
            });
            if (mockResp) return mockResp;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `The riddle was: "${body.riddle}"
The correct answer is: "${correct}"
The player answered: "${player}"

Is the player's answer semantically correct? Accept reasonable synonyms, alternate phrasings, and minor spelling variations. Be fairly generous in accepting answers.

Output ONLY valid JSON: { "correct": true|false, "feedback": "brief 1-sentence feedback" }`
            );
            const parsed = extractJSON(result.response.text()) as { correct: boolean; feedback: string };
            return NextResponse.json(parsed);
        }

        if (body.action === 'generate_mystery') {
            const difficulty = body.difficulty || 'medium';
            const rank = body.detectiveRank || 'Novice';

            const mockResp = hasApiKeyOrMock({
                id: crypto.randomUUID(),
                ...MOCK_MYSTERY,
                steps: MOCK_MYSTERY.steps.map((s, i) => ({ ...s, id: `mock-step-${i}`, solved: false, hintsUsed: 0 })),
            });
            if (mockResp) return mockResp;

            const stepCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
            const vocabHint = body.vocabWords?.length
                ? `\nIncorporate these vocabulary words as clue words or answers when possible: ${body.vocabWords.join(', ')}`
                : '';

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `Generate a detective-style word mystery for an RPG vocabulary game.
Difficulty: ${difficulty}. Player detective rank: ${rank}.${vocabHint}

Create a mystery with:
- A compelling title (short, evocative)
- An opening narrative (2-3 sentences, detective/fantasy tone)
- ${stepCount} progressive riddle steps, each with:
  - A riddle or logic puzzle (the riddle text)
  - 3 progressive hints (easy, medium, obvious)
  - The answer (a single word or short phrase)
  - A clue revealed after solving (connecting to the next step or final revelation)

Output ONLY valid JSON: { "title": "...", "narrative": "...", "steps": [{ "riddle": "...", "hint1": "...", "hint2": "...", "hint3": "...", "answer": "...", "clueRevealed": "..." }] }`
            );

            const parsed = extractJSON(result.response.text()) as Record<string, unknown>;
            const steps = ((parsed.steps as Array<Record<string, unknown>>) || []).map((s, i) => ({
                id: crypto.randomUUID(),
                riddle: String(s.riddle || ''),
                hint1: String(s.hint1 || ''),
                hint2: String(s.hint2 || ''),
                hint3: String(s.hint3 || ''),
                answer: String(s.answer || ''),
                clueRevealed: String(s.clueRevealed || ''),
                solved: false,
                hintsUsed: 0,
            }));

            return NextResponse.json({
                id: crypto.randomUUID(),
                title: String(parsed.title || MOCK_MYSTERY.title),
                narrative: String(parsed.narrative || MOCK_MYSTERY.narrative),
                steps,
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({
            id: crypto.randomUUID(),
            ...MOCK_MYSTERY,
            steps: MOCK_MYSTERY.steps.map((s, i) => ({ ...s, id: `mock-step-${i}`, solved: false, hintsUsed: 0 })),
            isMock: true,
            error: 'AI unavailable',
        }, { status: 500 });
    }
}, { rateLimitMax: 20 });
