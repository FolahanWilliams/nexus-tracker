import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';

interface QuizWord {
    word: string;
    definition: string;
    partOfSpeech: string;
    status?: string;
    confidenceRating?: number;
    lastConfidenceCorrect?: boolean;
    consecutiveFailures?: number;
    failedQuizTypes?: string[];
    totalReviews?: number;
    etymology?: string;
    relatedWords?: string[];
    antonym?: string;
}

/** Determine the best quiz type for a word based on its learning metadata */
function selectAdaptiveType(w: QuizWord): string {
    const status = w.status || 'new';
    const confidence = w.confidenceRating || 0;
    const correct = w.lastConfidenceCorrect;
    const failures = w.consecutiveFailures || 0;
    const reviews = w.totalReviews || 0;

    // New words → simple recognition (multiple_choice)
    if (status === 'new' || reviews === 0) return 'multiple_choice';

    // Confidence mismatch: high confidence but got wrong → harder type to challenge
    if (confidence >= 4 && correct === false) {
        return 'use_in_sentence';
    }

    // Confidence mismatch: low confidence but got right → reinforce with fill_blank
    if (confidence <= 2 && correct === true) {
        return 'fill_blank';
    }

    // Repeated failures → simpler types to rebuild confidence
    if (failures >= 3) return 'multiple_choice';
    if (failures >= 2) return 'reverse_choice';

    // Learning words → mix of reverse_choice and fill_blank
    if (status === 'learning') {
        const types = ['multiple_choice', 'reverse_choice', 'fill_blank'];
        return types[Math.floor(Math.random() * types.length)];
    }

    // Reviewing → harder types
    if (status === 'reviewing') {
        const types = ['reverse_choice', 'fill_blank', 'use_in_sentence'];
        if (w.etymology) types.push('etymology_drill');
        if (w.relatedWords?.length) types.push('synonym_match');
        if (w.antonym && w.antonym !== 'none') types.push('antonym_match');
        return types[Math.floor(Math.random() * types.length)];
    }

    // Mastered → hardest types (use_in_sentence, contextual_cloze, spelling)
    if (status === 'mastered') {
        const types = ['use_in_sentence', 'contextual_cloze', 'spelling_challenge', 'fill_blank'];
        if (w.etymology) types.push('etymology_drill');
        return types[Math.floor(Math.random() * types.length)];
    }

    // Default: alternate between core types
    const defaults = ['multiple_choice', 'reverse_choice', 'fill_blank', 'use_in_sentence'];
    return defaults[Math.floor(Math.random() * defaults.length)];
}

export async function POST(request: Request) {
    try {
        const { words, allWords, forcedType } = await request.json() as {
            words: QuizWord[];
            allWords?: QuizWord[];
            forcedType?: string;
        };

        if (!words || words.length === 0) {
            return NextResponse.json({ error: 'No words provided' }, { status: 400 });
        }

        const mockQuestions = words.map((w: QuizWord) => ({
            word: w.word,
            type: 'multiple_choice',
            question: `What does "${w.word}" mean?`,
            options: [
                w.definition,
                'An incorrect definition option A',
                'An incorrect definition option B',
                'An incorrect definition option C',
            ],
            correctIndex: 0,
            hint: `This is a ${w.partOfSpeech}.`,
        }));
        const mock = hasApiKeyOrMock({ questions: mockQuestions });
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
        });

        // Build adaptive type assignments for each word
        const wordEntries = words.map((w: QuizWord) => {
            const assignedType = forcedType || selectAdaptiveType(w);
            return {
                ...w,
                assignedType,
                entry: `- "${w.word}" (${w.partOfSpeech}): ${w.definition}${w.etymology ? ` [origin: ${w.etymology}]` : ''}${w.relatedWords?.length ? ` [related: ${w.relatedWords.join(', ')}]` : ''}${w.antonym && w.antonym !== 'none' ? ` [antonym: ${w.antonym}]` : ''} → TYPE: ${assignedType}`,
            };
        });
        const wordList = wordEntries.map(e => e.entry).join('\n');

        // Provide extra words for plausible distractors
        const extraWords = (allWords || [])
            .filter((aw: QuizWord) => !words.some((w: QuizWord) => w.word === aw.word))
            .slice(0, 20)
            .map((w: QuizWord) => `- "${w.word}": ${w.definition}`)
            .join('\n');

        const prompt = `You are a vocabulary quiz generator. Create quiz questions for these words.
Each word has a required TYPE — you MUST generate exactly that question type for each word.

${wordList}

Other words the learner knows (use these for plausible distractors):
${extraWords || '(none)'}

Question types:
1. "multiple_choice" — "What does [word] mean?" with 4 definition options
2. "reverse_choice" — Show the definition, ask which word matches, with 4 word options
3. "fill_blank" — A sentence with ___ where the word fits, with 4 word options
4. "use_in_sentence" — "Which sentence uses [word] correctly?" with 4 sentence options
5. "synonym_match" — "Which word is closest in meaning to [word]?" with 4 word options
6. "antonym_match" — "Which word is most opposite in meaning to [word]?" with 4 word options
7. "etymology_drill" — Ask about the word's origin/root meaning with 4 options
8. "contextual_cloze" — A paragraph with ___ requiring deeper context understanding, with 4 word options
9. "spelling_challenge" — Show the definition and pronunciation, ask "Spell the word". No options needed, include correctSpelling field

Rules:
- Wrong options must be plausible (same part of speech, similar difficulty)
- For fill_blank/contextual_cloze, use ___ as the blank marker
- For use_in_sentence, wrong sentences should misuse the word subtly
- correctIndex is the 0-based index of the correct answer
- For spelling_challenge: set options to [] and correctIndex to 0, add "correctSpelling" field with the word
- Shuffle the correct answer position
- Include a brief hint for each question

Output ONLY valid JSON: { "questions": [{ "word": "...", "type": "...", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0-3, "hint": "...", "correctSpelling": "..." }] }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const data = extractJSON(text) as { questions: unknown[] };

        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error('Invalid quiz response');
        }

        // Validate each question has required fields
        const validQuestions = (data.questions as Record<string, unknown>[]).filter(q => {
            if (typeof q.word !== 'string' || typeof q.question !== 'string') return false;
            // Spelling challenges don't need options
            if (q.type === 'spelling_challenge') {
                return typeof q.correctSpelling === 'string' || typeof q.word === 'string';
            }
            return Array.isArray(q.options) &&
                typeof q.correctIndex === 'number' &&
                q.correctIndex >= 0 &&
                q.correctIndex < (q.options as unknown[]).length;
        });

        if (validQuestions.length === 0) {
            throw new Error('All questions failed validation');
        }

        return NextResponse.json({ questions: validQuestions });
    } catch (error) {
        logger.error('Quiz generation error', 'generate-quiz', error);
        return NextResponse.json({
            questions: [],
            isMock: true,
            error: 'AI unavailable — could not generate quiz',
        });
    }
}
