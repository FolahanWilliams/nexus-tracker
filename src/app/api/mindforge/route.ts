import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';

type ChallengeType = 'argument' | 'analogy' | 'summary' | 'speaking';

interface ArgumentRequest {
    type: 'argument';
    action: 'generate_topic' | 'evaluate';
    topic?: string;
    claim?: string;
    evidence?: string;
    counterargument?: string;
    rebuttal?: string;
    vocabWords?: string[];
}

interface AnalogyRequest {
    type: 'analogy';
    action: 'generate_prompt' | 'evaluate';
    conceptA?: string;
    conceptB?: string;
    analogy?: string;
    vocabWords?: string[];
}

interface SummaryRequest {
    type: 'summary';
    action: 'generate_passage' | 'evaluate';
    passage?: string;
    summary?: string;
    vocabWords?: string[];
}

interface SpeakingRequest {
    type: 'speaking';
    action: 'generate_prompt' | 'analyze';
    transcript?: string;
    topic?: string;
    vocabWords?: string[];
}

type MindForgeRequest = ArgumentRequest | AnalogyRequest | SummaryRequest | SpeakingRequest;

export async function POST(request: Request) {
    try {
        const body = await request.json() as MindForgeRequest;

        // ── ARGUMENT BUILDER ──
        if (body.type === 'argument') {
            if (body.action === 'generate_topic') {
                const mockTopics = [
                    { topic: 'Social media has done more harm than good for society.', difficulty: 'intermediate' },
                    { topic: 'Remote work should become the default for office jobs.', difficulty: 'beginner' },
                    { topic: 'Artificial intelligence will create more jobs than it destroys.', difficulty: 'advanced' },
                ];
                const mock = hasApiKeyOrMock({ topics: mockTopics });
                if (mock) return mock;

                const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                const vocabHint = body.vocabWords?.length
                    ? `\nThe user is learning these vocabulary words, so try to pick topics where they might naturally use some of them: ${body.vocabWords.slice(0, 15).join(', ')}`
                    : '';

                const result = await model.generateContent(
                    `Generate 3 debate/argument topics for a cognitive training exercise. Topics should be thought-provoking and debatable, not trivially one-sided. Vary the difficulty.${vocabHint}

Output ONLY valid JSON: { "topics": [{ "topic": "...", "difficulty": "beginner|intermediate|advanced" }] }`
                );
                const data = extractJSON(result.response.text()) as { topics: unknown[] };
                return NextResponse.json(data);
            }

            if (body.action === 'evaluate') {
                const mockResult = {
                    score: 65,
                    clarity: 3,
                    logic: 3,
                    evidence: 2,
                    rebuttal: 3,
                    vocabUsage: 0,
                    feedback: 'Good structure, but your evidence could be more specific.',
                    strengths: ['Clear claim statement', 'Attempted to address counterarguments'],
                    improvements: ['Use concrete data or examples as evidence', 'Strengthen the rebuttal with a more direct response'],
                };
                const mock = hasApiKeyOrMock({ result: mockResult });
                if (mock) return mock;

                const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                const vocabHint = body.vocabWords?.length
                    ? `\nBonus: The user is learning these vocab words: ${body.vocabWords.join(', ')}. Award vocabUsage points (0-5) for naturally incorporating them.`
                    : '';

                const result = await model.generateContent(
                    `You are an argument analysis expert. Evaluate this structured argument:

Topic: "${body.topic}"
Claim: "${body.claim}"
Evidence: "${body.evidence}"
Counterargument: "${body.counterargument}"
Rebuttal: "${body.rebuttal}"
${vocabHint}

Rate each dimension 1-5:
- clarity: Is the claim clear and specific?
- logic: Does the argument follow logically?
- evidence: Is the evidence convincing and specific?
- rebuttal: Does the rebuttal effectively counter the counterargument?

Give an overall score 0-100, brief encouraging feedback (2-3 sentences), list 2 strengths, and list 2 specific improvements.

Output ONLY valid JSON: { "score": 0-100, "clarity": 1-5, "logic": 1-5, "evidence": 1-5, "rebuttal": 1-5, "vocabUsage": 0-5, "feedback": "...", "strengths": ["..."], "improvements": ["..."] }`
                );
                const data = extractJSON(result.response.text());
                return NextResponse.json({ result: data });
            }
        }

        // ── ANALOGY ENGINE ──
        if (body.type === 'analogy') {
            if (body.action === 'generate_prompt') {
                const mockPrompts = [
                    { conceptA: 'Memory', conceptB: 'A library', difficulty: 'beginner', hint: 'Think about how information is organized and retrieved.' },
                    { conceptA: 'Democracy', conceptB: 'A garden', difficulty: 'intermediate', hint: 'Consider the roles of cultivation, diversity, and maintenance.' },
                    { conceptA: 'Consciousness', conceptB: 'An ocean', difficulty: 'advanced', hint: 'Think about depth, currents, and what lies beneath the surface.' },
                ];
                const mock = hasApiKeyOrMock({ prompts: mockPrompts });
                if (mock) return mock;

                const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                const vocabHint = body.vocabWords?.length
                    ? `\nThe user is learning these vocab words — pick concepts where they might use some: ${body.vocabWords.slice(0, 15).join(', ')}`
                    : '';

                const result = await model.generateContent(
                    `Generate 3 analogy prompts for a cognitive training exercise. Each should pair two concepts and ask the user to explain how they're alike. Vary difficulty from simple to abstract.${vocabHint}

Output ONLY valid JSON: { "prompts": [{ "conceptA": "...", "conceptB": "...", "difficulty": "beginner|intermediate|advanced", "hint": "..." }] }`
                );
                const data = extractJSON(result.response.text());
                return NextResponse.json(data);
            }

            if (body.action === 'evaluate') {
                const mockResult = {
                    score: 70,
                    creativity: 3,
                    depth: 3,
                    clarity: 4,
                    vocabUsage: 0,
                    feedback: 'Good analogy! You identified meaningful connections.',
                    exampleAnalogy: 'Memory is like a library because both store information in organized systems, both require maintenance to stay useful, and both can become cluttered without regular curation.',
                };
                const mock = hasApiKeyOrMock({ result: mockResult });
                if (mock) return mock;

                const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                const vocabHint = body.vocabWords?.length
                    ? `\nBonus: The user is learning these vocab words: ${body.vocabWords.join(', ')}. Award vocabUsage points (0-5) for naturally incorporating them.`
                    : '';

                const result = await model.generateContent(
                    `You are an analogy evaluation expert. The user was asked: "How is ${body.conceptA} like ${body.conceptB}?"

Their analogy: "${body.analogy}"
${vocabHint}

Rate each dimension 1-5:
- creativity: How original and insightful are the connections?
- depth: How deep does the analogy go beyond surface similarities?
- clarity: Is the analogy clearly expressed?

Give an overall score 0-100, brief feedback (2-3 sentences), and provide an expert-level example analogy.

Output ONLY valid JSON: { "score": 0-100, "creativity": 1-5, "depth": 1-5, "clarity": 1-5, "vocabUsage": 0-5, "feedback": "...", "exampleAnalogy": "..." }`
                );
                const data = extractJSON(result.response.text());
                return NextResponse.json({ result: data });
            }
        }

        // ── SUMMARY CHALLENGE ──
        if (body.type === 'summary') {
            if (body.action === 'generate_passage') {
                const mockPassage = {
                    passage: 'The concept of neuroplasticity has revolutionized our understanding of the brain. Once thought to be fixed after childhood, scientists now know that the brain continuously reorganizes itself by forming new neural connections throughout life. This ability is influenced by learning, experience, and environmental factors. When we learn a new skill or form a new habit, our brain physically changes its structure. This has profound implications for education, rehabilitation after brain injuries, and our understanding of lifelong cognitive development.',
                    title: 'Neuroplasticity: The Changing Brain',
                    wordCount: 76,
                    difficulty: 'intermediate',
                };
                const mock = hasApiKeyOrMock(mockPassage);
                if (mock) return mock;

                const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                const vocabHint = body.vocabWords?.length
                    ? `\nThe user is learning these vocab words — try to include 1-2 naturally in the passage: ${body.vocabWords.slice(0, 10).join(', ')}`
                    : '';

                const result = await model.generateContent(
                    `Generate a passage (80-150 words) for a summary challenge exercise. The passage should be informative and dense with ideas, covering a topic from science, history, philosophy, psychology, or current events. Vary between factual, analytical, and argumentative styles.${vocabHint}

Output ONLY valid JSON: { "passage": "...", "title": "...", "wordCount": N, "difficulty": "beginner|intermediate|advanced" }`
                );
                const data = extractJSON(result.response.text());
                return NextResponse.json(data);
            }

            if (body.action === 'evaluate') {
                const mockResult = {
                    score: 72,
                    keyPoints: 3,
                    conciseness: 4,
                    clarity: 3,
                    vocabUsage: 0,
                    feedback: 'You captured most key points. Try to be more concise.',
                    missedPoints: ['The passage mentions rehabilitation implications which was not covered'],
                    modelSummary: 'The brain can reorganize itself throughout life by forming new neural connections, influenced by learning and environment, with implications for education and recovery.',
                };
                const mock = hasApiKeyOrMock({ result: mockResult });
                if (mock) return mock;

                const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                const vocabHint = body.vocabWords?.length
                    ? `\nBonus: The user is learning these vocab words: ${body.vocabWords.join(', ')}. Award vocabUsage points (0-5) for naturally incorporating them.`
                    : '';

                const result = await model.generateContent(
                    `You are a summary evaluation expert. The user was asked to summarize this passage in 1-3 sentences:

Original passage: "${body.passage}"

Their summary: "${body.summary}"
${vocabHint}

Rate each dimension 1-5:
- keyPoints: Were the main ideas captured?
- conciseness: Is the summary appropriately brief (not just rewriting)?
- clarity: Is the summary clearly expressed?

Give an overall score 0-100, brief feedback (2-3 sentences), list any key missed points, and provide a model summary (1-2 sentences).

Output ONLY valid JSON: { "score": 0-100, "keyPoints": 1-5, "conciseness": 1-5, "clarity": 1-5, "vocabUsage": 0-5, "feedback": "...", "missedPoints": ["..."], "modelSummary": "..." }`
                );
                const data = extractJSON(result.response.text());
                return NextResponse.json({ result: data });
            }
        }

        // ── IMPROMPTU SPEAKING ──
        if (body.type === 'speaking') {
            if (body.action === 'generate_prompt') {
                const mockPrompts = [
                    { topic: 'Describe a technology that changed your daily life and explain why.', difficulty: 'beginner', prepTime: 30, speakTime: 60 },
                    { topic: 'Argue for or against the idea that social media has improved human connection.', difficulty: 'intermediate', prepTime: 30, speakTime: 90 },
                    { topic: 'If you could redesign the education system from scratch, what would you change and why?', difficulty: 'advanced', prepTime: 30, speakTime: 120 },
                ];
                const mock = hasApiKeyOrMock({ prompts: mockPrompts });
                if (mock) return mock;

                const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                const vocabHint = body.vocabWords?.length
                    ? `\nThe user is learning these vocabulary words — pick topics where they might naturally use some: ${body.vocabWords.slice(0, 15).join(', ')}`
                    : '';

                const result = await model.generateContent(
                    `Generate 3 impromptu speaking prompts for a cognitive/articulation training exercise. Topics should be thought-provoking and encourage structured, articulate responses. Vary difficulty.${vocabHint}

Each prompt should include a suggested preparation time (30 seconds) and speaking time (60-120 seconds based on difficulty).

Output ONLY valid JSON: { "prompts": [{ "topic": "...", "difficulty": "beginner|intermediate|advanced", "prepTime": 30, "speakTime": 60|90|120 }] }`
                );
                const data = extractJSON(result.response.text());
                return NextResponse.json(data);
            }

            if (body.action === 'analyze') {
                const mockResult = {
                    score: 68,
                    vocabDiversity: 3,
                    structure: 3,
                    clarity: 4,
                    coherence: 3,
                    vocabUsage: 0,
                    fillerCount: 4,
                    fillerWords: ['um', 'like', 'you know', 'um'],
                    wordCount: 87,
                    sentenceCount: 6,
                    feedback: 'Good effort! Your ideas were clear but could use more structure. Try to reduce filler words.',
                    strengths: ['Clear main idea', 'Good use of examples'],
                    improvements: ['Reduce filler words (4 detected)', 'Add a stronger conclusion'],
                    vocabWordsUsed: [],
                };
                const mock = hasApiKeyOrMock({ result: mockResult });
                if (mock) return mock;

                const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
                const vocabHint = body.vocabWords?.length
                    ? `\nBonus: The user is learning these vocab words: ${body.vocabWords.join(', ')}. Award vocabUsage points (0-5) for naturally incorporating them. List which ones were used in vocabWordsUsed.`
                    : '';

                const result = await model.generateContent(
                    `You are a speech analysis expert. Analyze this impromptu speech transcript for articulation quality.

Topic: "${body.topic}"
Transcript: "${body.transcript}"
${vocabHint}

Analyze the following:
1. Count filler words (um, uh, like, you know, basically, literally, actually, so, right, I mean)
2. Assess vocabulary diversity (1-5): variety and sophistication of word choices
3. Assess structure (1-5): logical flow, introduction, body, conclusion
4. Assess clarity (1-5): how clearly ideas are expressed
5. Assess coherence (1-5): how well ideas connect and build on each other

Give an overall score 0-100, brief feedback (2-3 sentences), list 2 strengths, and list 2 specific improvements.

Output ONLY valid JSON: { "score": 0-100, "vocabDiversity": 1-5, "structure": 1-5, "clarity": 1-5, "coherence": 1-5, "vocabUsage": 0-5, "fillerCount": N, "fillerWords": ["..."], "wordCount": N, "sentenceCount": N, "feedback": "...", "strengths": ["..."], "improvements": ["..."], "vocabWordsUsed": ["..."] }`
                );
                const data = extractJSON(result.response.text());
                return NextResponse.json({ result: data });
            }
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error) {
        logger.error('MindForge API error', 'mindforge', error);
        return NextResponse.json({ error: 'AI unavailable', isMock: true }, { status: 500 });
    }
}
