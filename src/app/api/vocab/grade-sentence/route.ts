import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';

export async function POST(request: Request) {
    try {
        const { word, definition, partOfSpeech, sentence, challengeType } = await request.json() as {
            word: string;
            definition: string;
            partOfSpeech: string;
            sentence: string;
            challengeType: 'sentence_construction' | 'paraphrase_challenge';
        };

        if (!word || !sentence) {
            return NextResponse.json({ error: 'Missing word or sentence' }, { status: 400 });
        }

        const mockResult = {
            correct: sentence.toLowerCase().includes(word.toLowerCase()),
            score: sentence.toLowerCase().includes(word.toLowerCase()) ? 75 : 30,
            correctUsage: sentence.toLowerCase().includes(word.toLowerCase()),
            grammar: true,
            naturalness: true,
            feedback: sentence.toLowerCase().includes(word.toLowerCase())
                ? 'Good use of the word! Your sentence demonstrates understanding.'
                : 'The word was not used correctly in this sentence.',
            improvedVersion: `The ${word} nature of the moment made it unforgettable.`,
        };
        const mock = hasApiKeyOrMock({ result: mockResult });
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
        });

        const prompt = challengeType === 'paraphrase_challenge'
            ? `You are an English language evaluator. A student was given a sentence and asked to rewrite it using the word "${word}" (${partOfSpeech}: ${definition}).

Their rewrite: "${sentence}"

Evaluate their paraphrase on these criteria:
1. correctUsage: Does the sentence use "${word}" with the correct meaning?
2. grammar: Is the sentence grammatically correct?
3. naturalness: Does the sentence sound natural and fluent?
4. Does it preserve the original meaning while incorporating the target word?

Give a score from 0-100 and mark correct=true if score >= 60.
Provide brief, encouraging feedback (1-2 sentences) and an improved version if the score is below 80.

Output ONLY valid JSON: { "correct": bool, "score": 0-100, "correctUsage": bool, "grammar": bool, "naturalness": bool, "feedback": "...", "improvedVersion": "..." }`
            : `You are an English language evaluator. A student was asked to write a sentence using the word "${word}" (${partOfSpeech}: ${definition}).

Their sentence: "${sentence}"

Evaluate their sentence on these criteria:
1. correctUsage: Does the sentence use "${word}" with the correct meaning and in a grammatically appropriate way for a ${partOfSpeech}?
2. grammar: Is the sentence grammatically correct overall?
3. naturalness: Does the sentence sound natural and fluent (not forced or awkward)?

Give a score from 0-100 where:
- 90-100: Perfect usage, natural, sophisticated
- 70-89: Correct usage, minor style issues
- 50-69: Technically correct but awkward or simplistic
- 30-49: Partially correct usage or grammar issues
- 0-29: Incorrect usage or major errors

Mark correct=true if score >= 60.
Provide brief, encouraging feedback (1-2 sentences). If score < 80, include an improvedVersion showing a better sentence.

Output ONLY valid JSON: { "correct": bool, "score": 0-100, "correctUsage": bool, "grammar": bool, "naturalness": bool, "feedback": "...", "improvedVersion": "..." }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const data = extractJSON(text) as Record<string, unknown>;

        if (typeof data.correct !== 'boolean' || typeof data.score !== 'number') {
            throw new Error('Invalid grading response');
        }

        return NextResponse.json({ result: data });
    } catch (error) {
        logger.error('Sentence grading error', 'grade-sentence', error);
        return NextResponse.json({
            result: {
                correct: false,
                score: 0,
                correctUsage: false,
                grammar: false,
                naturalness: false,
                feedback: 'Could not grade your sentence. Please try again.',
            },
            isMock: true,
        });
    }
}
