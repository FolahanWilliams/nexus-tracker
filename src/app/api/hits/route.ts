import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput } from '@/lib/sanitize';

interface HitsRequest {
    type: 'suggest_model' | 'evaluate_output' | 'score_recall' | 'generate_challenge_topic';
    pillar?: string;
    outputType?: string;
    content?: string;
    recalledFields?: Record<string, string>;
    originalFields?: Record<string, string>;
}

export const POST = withAuth(async (request) => {
    try {
        const raw = await request.json();
        if (raw.content) raw.content = sanitizePromptInput(raw.content, 5000);
        if (raw.pillar) raw.pillar = sanitizePromptInput(raw.pillar, 50);
        if (raw.outputType) raw.outputType = sanitizePromptInput(raw.outputType, 50);
        const body = raw as HitsRequest;

        // ── SUGGEST MODEL ──
        if (body.type === 'suggest_model') {
            const mockModel = {
                name: 'Incentives',
                definition: 'People do what they are rewarded for, not what they are told to do.',
                coreMechanism: 'Behavior follows reward structures. Change the incentives, change the behavior.',
                examples: {
                    history: 'Cobra bounty in colonial India backfired when people bred cobras for the reward.',
                    business: 'Sales commissions shape whether reps push high-margin or high-volume products.',
                    startups: 'Equity vesting aligns employee incentives with long-term company success.',
                    personal: 'You study harder for subjects with immediate grade impact.',
                },
                limitations: 'Intrinsic motivation can override external incentives. Over-incentivizing can crowd out internal drive.',
                actionRule: 'Before trying to change behavior, first ask: what are the current incentives?',
                keyQuestion: 'What is this person/system rewarded for doing?',
            };
            const mock = hasApiKeyOrMock(mockModel);
            if (mock) return mock;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const pillarContext = body.pillar ? `Focus on the "${body.pillar}" domain.` : '';
            const result = await model.generateContent(
                `You are a mental models expert. Suggest one powerful mental model for learning. ${pillarContext}

Return JSON:
{
  "name": "Model Name",
  "definition": "One sentence definition",
  "coreMechanism": "How it works",
  "examples": {
    "history": "Historical example",
    "business": "Business example",
    "startups": "Startup example",
    "personal": "Personal life example"
  },
  "limitations": "When it fails",
  "actionRule": "What to do with this knowledge",
  "keyQuestion": "Question this model helps answer"
}`
            );
            const text = result.response.text();
            return NextResponse.json(extractJSON(text));
        }

        // ── EVALUATE OUTPUT ──
        if (body.type === 'evaluate_output') {
            const mockEval = { score: 72, feedback: 'Good structure and clarity. Consider adding more specific examples to strengthen your argument.' };
            const mock = hasApiKeyOrMock(mockEval);
            if (mock) return mock;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `You are an expert writing coach. Evaluate this ${body.outputType || 'essay'} on clarity, depth of thinking, and actionability. Score 0-100.

Content:
${body.content}

Return JSON: { "score": number, "feedback": "2-3 sentences of specific feedback" }`
            );
            const text = result.response.text();
            return NextResponse.json(extractJSON(text));
        }

        // ── SCORE RECALL ──
        if (body.type === 'score_recall') {
            const mockRecall = { score: 65, feedback: 'Good recall on definition and mechanism. The example was partially correct. Review the action rule.' };
            const mock = hasApiKeyOrMock(mockRecall);
            if (mock) return mock;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `Compare these recalled answers against the originals and score accuracy 0-100.

Original: ${JSON.stringify(body.originalFields)}
Recalled: ${JSON.stringify(body.recalledFields)}

Return JSON: { "score": number, "feedback": "Brief feedback on what was recalled well and what needs review" }`
            );
            const text = result.response.text();
            return NextResponse.json(extractJSON(text));
        }

        // ── GENERATE CHALLENGE TOPIC ──
        if (body.type === 'generate_challenge_topic') {
            const mockTopic = { topic: 'The rise and fall of social media empires' };
            const mock = hasApiKeyOrMock(mockTopic);
            if (mock) return mock;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `Generate one random, thought-provoking topic for analysis through mental models (incentives, compounding, feedback loops, second-order effects).
Pick from diverse domains: war, marketing, sports, religion, AI, politics, economics, culture, technology, education, health.
Return JSON: { "topic": "the topic" }`
            );
            const text = result.response.text();
            return NextResponse.json(extractJSON(text));
        }

        return NextResponse.json({ error: 'Unknown request type' }, { status: 400 });
    } catch (error) {
        console.error('HITS API error:', error);
        return NextResponse.json(
            { error: 'AI unavailable', isMock: true, score: 50, feedback: 'AI evaluation unavailable.' },
            { status: 500 }
        );
    }
}, { rateLimitMax: 30 });
