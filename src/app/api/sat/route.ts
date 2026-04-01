import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput } from '@/lib/sanitize';

interface SATRequest {
    type: 'generate_vocab' | 'generate_passage' | 'generate_writing' | 'generate_math' | 'generate_practice_test';
    difficulty?: string;
    topic?: string;
    count?: number;
    existingWords?: string[];
    mathType?: string;
    section?: string;
}

export const POST = withAuth(async (request) => {
    try {
        const raw = await request.json();
        if (raw.topic) raw.topic = sanitizePromptInput(raw.topic, 200);
        if (raw.mathType) raw.mathType = sanitizePromptInput(raw.mathType, 50);
        if (raw.difficulty) raw.difficulty = sanitizePromptInput(raw.difficulty, 20);
        const body = raw as SATRequest;

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        // ── GENERATE SAT VOCAB ──
        if (body.type === 'generate_vocab') {
            const existingList = (body.existingWords || []).join(', ');
            const mockWords = [
                { word: 'Ambivalent', definition: 'Having mixed or contradictory feelings about something', partOfSpeech: 'adjective', examples: ['She felt ambivalent about moving to a new city.', 'His ambivalent response left us uncertain about his decision.'], mnemonic: 'Ambi (both) + valent (strength) = pulled in two directions equally', pronunciation: '/æmˈbɪv.ə.lənt/', difficulty: 'intermediate', category: 'SAT', etymology: 'Latin ambi- (both) + valentia (strength)', relatedWords: ['uncertain', 'conflicted', 'indecisive'], antonym: 'decisive' },
                { word: 'Pragmatic', definition: 'Dealing with things sensibly and realistically rather than ideally', partOfSpeech: 'adjective', examples: ['A pragmatic approach to solving the budget crisis was needed.', 'She was known for her pragmatic leadership style.'], mnemonic: 'PRAG = PRActical Guide', pronunciation: '/præɡˈmæt.ɪk/', difficulty: 'intermediate', category: 'SAT', etymology: 'Greek pragmatikos (fit for action)', relatedWords: ['practical', 'realistic', 'sensible'], antonym: 'idealistic' },
                { word: 'Ephemeral', definition: 'Lasting for a very short time', partOfSpeech: 'adjective', examples: ['The ephemeral beauty of cherry blossoms draws tourists each spring.', 'Social media trends are often ephemeral.'], mnemonic: 'E-FEMUR-al: imagine a leg bone that disappears quickly', pronunciation: '/ɪˈfem.ər.əl/', difficulty: 'intermediate', category: 'SAT', etymology: 'Greek ephemeros (lasting only a day)', relatedWords: ['transient', 'fleeting', 'momentary'], antonym: 'permanent' },
            ];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock is array
            const mock = hasApiKeyOrMock(mockWords as any);
            if (mock) return mock;

            const result = await model.generateContent(
                `You are an SAT vocabulary expert. Generate ${body.count || 3} SAT-level vocabulary words.

Requirements:
- Words should be commonly tested on the SAT
- Include words across difficulty levels but focus on high-frequency SAT words
- Do NOT include words the student already knows: ${existingList || 'none yet'}
- Each word must have category: "SAT"

Return a JSON array:
[{
  "word": "Word",
  "definition": "Clear, concise definition",
  "partOfSpeech": "noun/verb/adjective/adverb",
  "examples": ["SAT-style sentence 1", "SAT-style sentence 2"],
  "mnemonic": "Memory aid",
  "pronunciation": "IPA pronunciation",
  "difficulty": "intermediate",
  "category": "SAT",
  "etymology": "Word origin",
  "relatedWords": ["synonym1", "synonym2", "synonym3"],
  "antonym": "opposite word or 'none'"
}]`
            );
            const words = extractJSON(result.response.text());
            return NextResponse.json(Array.isArray(words) ? words : [words]);
        }

        // ── GENERATE READING PASSAGE ──
        if (body.type === 'generate_passage') {
            const diff = body.difficulty || 'medium';
            const topic = body.topic || 'science';
            const mockPassage = {
                passage: 'The concept of neuroplasticity has revolutionized our understanding of the brain. Once believed to be fixed after childhood, the brain is now known to reorganize itself by forming new neural connections throughout life. This discovery has profound implications for education, rehabilitation, and our understanding of human potential.\n\nResearchers at the National Institutes of Health have demonstrated that targeted cognitive exercises can strengthen specific neural pathways. In one landmark study, participants who engaged in daily memory training showed measurable increases in hippocampal volume after just eight weeks.',
                questions: [
                    { question: 'What is the primary purpose of this passage?', options: ['To argue against traditional neuroscience', 'To explain how neuroplasticity changes our understanding of the brain', 'To promote a specific brain-training program', 'To compare childhood and adult brain development'], correctIndex: 1, explanation: 'The passage focuses on explaining how neuroplasticity has changed scientific understanding of the brain.' },
                    { question: 'As used in the passage, "profound" most nearly means:', options: ['deep and meaningful', 'difficult to understand', 'controversial', 'temporary'], correctIndex: 0, explanation: '"Profound" here means deep and meaningful, referring to the significant impact of the discovery.' },
                    { question: 'Which evidence does the author use to support the claim about neuroplasticity?', options: ['Personal anecdotes', 'A research study from the NIH', 'Expert opinions', 'Historical examples'], correctIndex: 1, explanation: 'The author cites a landmark study from the National Institutes of Health showing measurable brain changes.' },
                    { question: 'The tone of this passage is best described as:', options: ['skeptical', 'informative and optimistic', 'argumentative', 'neutral and detached'], correctIndex: 1, explanation: 'The passage presents information positively, highlighting the "revolutionary" nature of the discovery.' },
                ],
                topic: 'science',
                difficulty: diff,
            };
            const mock = hasApiKeyOrMock(mockPassage);
            if (mock) return mock;

            const result = await model.generateContent(
                `You are an SAT Reading section expert. Generate a reading comprehension passage with questions.

Topic area: ${topic}
Difficulty: ${diff}

Generate a passage of 150-250 words that resembles Digital SAT reading passages, followed by 4 multiple-choice questions.

Return JSON:
{
  "passage": "The passage text with multiple paragraphs...",
  "questions": [
    {
      "question": "Question text?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctIndex": 0,
      "explanation": "Why this answer is correct"
    }
  ],
  "topic": "${topic}",
  "difficulty": "${diff}"
}`
            );
            return NextResponse.json(extractJSON(result.response.text()));
        }

        // ── GENERATE WRITING/GRAMMAR QUESTIONS ──
        if (body.type === 'generate_writing') {
            const mockWriting = [
                { sentence: 'The committee have decided to postpone the meeting until next week.', options: ['NO CHANGE', 'has decided', 'are deciding', 'were decided'], correctIndex: 1, rule: 'Subject-verb agreement with collective nouns', explanation: '"Committee" is a collective noun treated as singular in American English, requiring "has" instead of "have".' },
                { sentence: 'Running through the park, the sunset was beautiful to the jogger.', options: ['NO CHANGE', 'the jogger found the sunset beautiful', 'the sunset looked beautiful', 'it was beautiful, the sunset'], correctIndex: 1, rule: 'Dangling modifier', explanation: 'The participial phrase "Running through the park" must modify the subject doing the running (the jogger), not the sunset.' },
                { sentence: 'The research paper; which was published last year, has been cited over 500 times.', options: ['NO CHANGE', 'paper, which was published last year,', 'paper which was published last year', 'paper: which was published last year,'], correctIndex: 1, rule: 'Punctuation with nonrestrictive clauses', explanation: 'A nonrestrictive clause (providing extra info) should be set off by commas, not semicolons.' },
                { sentence: 'Neither the students nor the teacher are aware of the schedule change.', options: ['NO CHANGE', 'is aware', 'were aware', 'have been aware'], correctIndex: 1, rule: 'Subject-verb agreement with neither/nor', explanation: 'With neither/nor, the verb agrees with the nearest subject ("teacher" = singular, so "is").' },
                { sentence: 'The novel explores themes of identity; furthermore, it examines the impact of technology on modern relationships.', options: ['NO CHANGE', 'identity, furthermore, it', 'identity; furthermore it', 'identity. Furthermore, it'], correctIndex: 0, rule: 'Semicolon usage with conjunctive adverbs', explanation: 'A semicolon before "furthermore" followed by a comma is correct punctuation for joining independent clauses with a conjunctive adverb.' },
            ];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock is array
            const mock = hasApiKeyOrMock(mockWriting as any);
            if (mock) return mock;

            const result = await model.generateContent(
                `You are an SAT Writing section expert. Generate 5 grammar and writing questions in the style of the Digital SAT.

Each question presents a sentence with an underlined portion (the entire sentence is the context). The student must choose the best revision.

Cover these SAT grammar rules:
- Subject-verb agreement
- Pronoun clarity
- Modifier placement
- Punctuation (commas, semicolons, colons)
- Verb tense consistency
- Sentence structure and clarity

Return a JSON array:
[{
  "sentence": "The full sentence with the portion in question",
  "options": ["NO CHANGE", "option B", "option C", "option D"],
  "correctIndex": 0-3,
  "rule": "Grammar rule being tested",
  "explanation": "Why the correct answer is right"
}]`
            );
            return NextResponse.json(extractJSON(result.response.text()));
        }

        // ── GENERATE MATH PROBLEMS ──
        if (body.type === 'generate_math') {
            const mathType = body.mathType || 'algebra';
            const diff = body.difficulty || 'medium';
            const mockMath = [
                { question: 'If 3x + 7 = 22, what is the value of 6x + 14?', type: 'algebra', difficulty: diff, options: ['30', '44', '37', '52'], correctAnswer: '44', explanation: 'Since 3x + 7 = 22, then 6x + 14 = 2(3x + 7) = 2(22) = 44.', steps: ['Recognize that 6x + 14 = 2(3x + 7)', 'Substitute: 2(22) = 44'] },
                { question: 'A store increases the price of an item by 20%, then offers a 20% discount on the new price. What is the net percentage change from the original price?', type: 'problem-solving', difficulty: diff, options: ['0% (no change)', '-4%', '+4%', '-2%'], correctAnswer: '-4%', explanation: 'Let original = 100. After 20% increase: 120. After 20% discount: 120 × 0.80 = 96. Net change: -4%.', steps: ['Assume original price = $100', 'After 20% increase: $100 × 1.20 = $120', 'After 20% discount on new price: $120 × 0.80 = $96', 'Net change: ($96 - $100)/$100 = -4%'] },
                { question: 'The function f(x) = 2x² - 8x + 6 can be rewritten as f(x) = 2(x - h)² + k. What is the value of h + k?', type: 'advanced-math', difficulty: diff, options: ['0', '1', '2', '-2'], correctAnswer: '0', explanation: 'Complete the square: f(x) = 2(x² - 4x) + 6 = 2(x² - 4x + 4 - 4) + 6 = 2(x - 2)² - 8 + 6 = 2(x - 2)² - 2. So h = 2, k = -2, h + k = 0.', steps: ['Factor out 2: f(x) = 2(x² - 4x) + 6', 'Complete the square: 2(x² - 4x + 4 - 4) + 6', 'Simplify: 2(x - 2)² - 8 + 6 = 2(x - 2)² - 2', 'h = 2, k = -2, so h + k = 0'] },
            ];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock is array
            const mock = hasApiKeyOrMock(mockMath as any);
            if (mock) return mock;

            const result = await model.generateContent(
                `You are a Digital SAT Math section expert. Generate 3 math problems.

Math type: ${mathType}
Difficulty: ${diff}

SAT Math covers:
- Algebra (linear equations, inequalities, systems)
- Advanced Math (quadratics, polynomials, exponentials, radicals)
- Problem Solving & Data Analysis (ratios, percentages, probability, statistics)
- Geometry & Trigonometry (area, volume, angles, trig ratios)

Generate problems appropriate for the Digital SAT format. Each must have 4 multiple-choice options.

Return a JSON array:
[{
  "question": "Problem text (use clear math notation)",
  "type": "${mathType}",
  "difficulty": "${diff}",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "The correct option value",
  "explanation": "Brief explanation of the solution",
  "steps": ["Step 1...", "Step 2...", "Step 3..."]
}]`
            );
            return NextResponse.json(extractJSON(result.response.text()));
        }

        // ── GENERATE PRACTICE TEST ──
        if (body.type === 'generate_practice_test') {
            const section = body.section || 'full';
            const mockTest = {
                section,
                questions: [
                    { id: '1', section: 'reading-writing', type: 'reading', question: 'Based on the excerpt, the author most likely believes that:', passage: 'Innovation in technology often follows unexpected paths. The development of penicillin, for instance, arose from a contaminated petri dish — an accident that Alexander Fleming transformed into one of medicine\'s greatest breakthroughs.', options: ['Scientific progress is always accidental', 'Important discoveries can arise from unexpected circumstances', 'Technology follows a predictable path', 'Medicine is the most important field of science'], correctIndex: 1, explanation: 'The passage emphasizes how innovation follows "unexpected paths" and uses penicillin as an example of an accidental discovery leading to a breakthrough.' },
                    { id: '2', section: 'reading-writing', type: 'grammar', question: 'Choose the best revision:', sentence: 'The team of scientists were analyzing the data carefully, looking for patterns they might of missed.', options: ['NO CHANGE', 'was analyzing the data carefully, looking for patterns they might have missed', 'were analyzing the data carefully, looking for patterns they might have missed', 'was analyzing the data carefully, looking for patterns they might of missed'], correctIndex: 1, explanation: '"Team" is singular (use "was"), and "might have" is correct (not "might of").' },
                    { id: '3', section: 'math', type: 'algebra', question: 'If 2(x - 3) + 5 = 15, what is the value of x?', options: ['5', '8', '6', '7'], correctIndex: 1, explanation: '2(x-3) + 5 = 15 → 2(x-3) = 10 → x-3 = 5 → x = 8' },
                    { id: '4', section: 'math', type: 'problem-solving', question: 'A bag contains 5 red, 3 blue, and 2 green marbles. If two marbles are drawn without replacement, what is the probability that both are red?', options: ['1/4', '2/9', '5/18', '1/2'], correctIndex: 1, explanation: 'P(1st red) = 5/10 = 1/2. P(2nd red | 1st red) = 4/9. P(both red) = 1/2 × 4/9 = 4/18 = 2/9.' },
                ],
                timeLimit: 900,
            };
            const mock = hasApiKeyOrMock(mockTest);
            if (mock) return mock;

            const result = await model.generateContent(
                `You are a Digital SAT expert. Generate a mini practice test with 10 questions.

${section === 'full' ? 'Include 5 Reading & Writing questions and 5 Math questions.' : section === 'reading-writing' ? 'Include 10 Reading & Writing questions.' : 'Include 10 Math questions.'}

For Reading & Writing questions, include either:
- A short passage (2-3 sentences) with a comprehension question
- A grammar/writing revision question

For Math questions, cover a mix of algebra, advanced math, problem solving, and geometry.

Return JSON:
{
  "section": "${section}",
  "questions": [
    {
      "id": "1",
      "section": "reading-writing" or "math",
      "type": "reading" | "grammar" | "algebra" | "advanced-math" | "problem-solving" | "geometry",
      "question": "Question text",
      "passage": "Optional passage text for reading questions",
      "sentence": "Optional sentence for grammar questions",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0-3,
      "explanation": "Solution explanation"
    }
  ],
  "timeLimit": 900
}`
            );
            return NextResponse.json(extractJSON(result.response.text()));
        }

        return NextResponse.json({ error: 'Unknown SAT request type' }, { status: 400 });
    } catch (error) {
        console.error('SAT API error:', error);
        return NextResponse.json(
            { error: 'Failed to process SAT request' },
            { status: 500 }
        );
    }
}, { rateLimitMax: 30 });
