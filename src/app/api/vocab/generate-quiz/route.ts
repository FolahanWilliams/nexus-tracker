import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';

interface QuizWord {
    word: string;
    definition: string;
    partOfSpeech: string;
}

export async function POST(request: Request) {
    try {
        const { words, allWords } = await request.json() as {
            words: QuizWord[];
            allWords?: QuizWord[];
        };

        if (!words || words.length === 0) {
            return NextResponse.json({ error: 'No words provided' }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
            // Generate mock quiz questions
            const questions = words.map((w: QuizWord) => ({
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
            return NextResponse.json({ questions, isMock: true });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
        });

        const wordList = words.map((w: QuizWord) => `- "${w.word}" (${w.partOfSpeech}): ${w.definition}`).join('\n');

        // Provide extra words for plausible distractors
        const extraWords = (allWords || [])
            .filter((aw: QuizWord) => !words.some((w: QuizWord) => w.word === aw.word))
            .slice(0, 20)
            .map((w: QuizWord) => `- "${w.word}": ${w.definition}`)
            .join('\n');

        const prompt = `You are a vocabulary quiz generator. Create quiz questions for these words:

${wordList}

Other words the learner knows (use these for plausible distractors):
${extraWords || '(none)'}

For EACH word, generate ONE question. Alternate between these types:
1. "multiple_choice" — "What does [word] mean?" with 4 options (1 correct, 3 plausible wrong)
2. "reverse_choice" — Show the definition, ask which word matches, with 4 word options
3. "fill_blank" — A sentence with a blank where the word fits, with 4 word options
4. "use_in_sentence" — Show the word and ask "Which sentence uses [word] correctly?" with 4 sentence options (1 correct usage, 3 plausible but incorrect usages)

Rules:
- Wrong options must be plausible (same part of speech, similar difficulty level)
- For fill_blank, the sentence must make the meaning clear from context
- For use_in_sentence, the wrong sentences should misuse the word in a subtle way (wrong context, wrong meaning, wrong grammar)
- correctIndex is the 0-based index of the correct answer in the options array
- Include a brief hint for each question
- Shuffle the correct answer position (don't always put it first)

Output ONLY valid JSON: { "questions": [{ "word": "...", "type": "multiple_choice"|"reverse_choice"|"fill_blank"|"use_in_sentence", "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0-3, "hint": "..." }] }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const data = extractJSON(text) as { questions: unknown[] };

        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error('Invalid quiz response');
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Quiz generation error:', error);
        return NextResponse.json({
            questions: [],
            isMock: true,
            error: 'AI unavailable — could not generate quiz',
        });
    }
}
