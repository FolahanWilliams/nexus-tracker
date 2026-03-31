import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput } from '@/lib/sanitize';

interface HitsRequest {
    type: 'suggest_model' | 'evaluate_output' | 'score_recall' | 'generate_challenge_topic' | 'evaluate_transfer' | 'detect_connections' | 'generate_founder_insight' | 'detect_conflicts';
    pillar?: string;
    outputType?: string;
    content?: string;
    recalledFields?: Record<string, string>;
    originalFields?: Record<string, string>;
    // evaluate_transfer
    modelName?: string;
    modelDefinition?: string;
    domains?: string[];
    analogies?: string[];
    universalPrinciple?: string;
    // detect_connections
    modelCards?: { id: string; name: string; definition: string; coreMechanism: string; pillar: string }[];
    // generate_founder_insight
    modelCard?: { name: string; definition: string; coreMechanism: string; actionRule: string; examples: Record<string, string> };
    startupContext?: string;
    // detect_conflicts
    newCard?: { name: string; definition: string; coreMechanism: string };
    existingCards?: { id: string; name: string; definition: string; coreMechanism: string }[];
}

export const POST = withAuth(async (request) => {
    try {
        const raw = await request.json();
        if (raw.content) raw.content = sanitizePromptInput(raw.content, 5000);
        if (raw.pillar) raw.pillar = sanitizePromptInput(raw.pillar, 50);
        if (raw.outputType) raw.outputType = sanitizePromptInput(raw.outputType, 50);
        if (raw.modelName) raw.modelName = sanitizePromptInput(raw.modelName, 200);
        if (raw.modelDefinition) raw.modelDefinition = sanitizePromptInput(raw.modelDefinition, 500);
        if (raw.universalPrinciple) raw.universalPrinciple = sanitizePromptInput(raw.universalPrinciple, 1000);
        if (raw.startupContext) raw.startupContext = sanitizePromptInput(raw.startupContext, 2000);
        if (raw.analogies && Array.isArray(raw.analogies)) {
            raw.analogies = raw.analogies.map((a: string) => sanitizePromptInput(a, 500));
        }
        if (raw.domains && Array.isArray(raw.domains)) {
            raw.domains = raw.domains.map((d: string) => sanitizePromptInput(d, 100));
        }
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

        // ── SCORE RECALL (Semantic AI Comparison) ──
        if (body.type === 'score_recall') {
            const mockRecall = {
                score: 65,
                feedback: 'Good semantic recall on definition and mechanism. The example captured the core idea but missed specifics. Review the action rule.',
                fieldScores: { name: 18, definition: 20, mechanism: 15, example: 8, actionRule: 4 },
            };
            const mock = hasApiKeyOrMock(mockRecall);
            if (mock) return mock;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `You are an expert learning coach evaluating active recall quality. Compare the RECALLED answers against the ORIGINAL answers using SEMANTIC similarity, not just word matching.

A recalled answer that captures the core meaning in different words should score highly. Exact wording is NOT required — understanding is what matters.

ORIGINAL (correct answers):
- Name (20 pts): ${body.originalFields?.name || ''}
- Definition (25 pts): ${body.originalFields?.definition || ''}
- Core Mechanism (25 pts): ${body.originalFields?.mechanism || ''}
- Example (15 pts): ${body.originalFields?.example || ''}
- Action Rule (15 pts): ${body.originalFields?.actionRule || ''}

RECALLED (student's answers):
- Name: ${body.recalledFields?.name || '(blank)'}
- Definition: ${body.recalledFields?.definition || '(blank)'}
- Core Mechanism: ${body.recalledFields?.mechanism || '(blank)'}
- Example: ${body.recalledFields?.example || '(blank)'}
- Action Rule: ${body.recalledFields?.actionRule || '(blank)'}

Score each field based on semantic accuracy (0 to max points). Blank answers get 0.

Return JSON:
{
  "score": <total 0-100>,
  "fieldScores": { "name": <0-20>, "definition": <0-25>, "mechanism": <0-25>, "example": <0-15>, "actionRule": <0-15> },
  "feedback": "2-3 sentences: what was recalled well semantically, what needs review, and a specific tip for better retention"
}`
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

        // ── EVALUATE TRANSFER DRILL ──
        if (body.type === 'evaluate_transfer') {
            const mockTransfer = {
                score: 74,
                feedback: 'Strong cross-domain thinking. Your biology analogy shows deep understanding. The economics analogy could be more specific — try connecting to a concrete market example.',
                analogyScores: [82, 60, 80],
                principleScore: 75,
            };
            const mock = hasApiKeyOrMock(mockTransfer);
            if (mock) return mock;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `You are an expert in cross-domain thinking and analogical reasoning. Evaluate this transfer drill where the student applied a mental model to 3 different domains.

MENTAL MODEL:
Name: ${body.modelName || 'Unknown'}
Definition: ${body.modelDefinition || 'Not provided'}

TRANSFER DRILL:
Domain 1 (${body.domains?.[0] || 'Domain 1'}): ${body.analogies?.[0] || '(blank)'}
Domain 2 (${body.domains?.[1] || 'Domain 2'}): ${body.analogies?.[1] || '(blank)'}
Domain 3 (${body.domains?.[2] || 'Domain 3'}): ${body.analogies?.[2] || '(blank)'}

Universal Principle: ${body.universalPrinciple || '(blank)'}

Score each analogy (0-100) on:
- Accuracy: Does the analogy correctly apply the model's mechanism?
- Depth: Does it go beyond surface-level similarity?
- Creativity: Is the domain choice non-obvious?

Score the universal principle (0-100) on whether it correctly abstracts the common thread.

Return JSON:
{
  "score": <weighted average 0-100>,
  "analogyScores": [<score1>, <score2>, <score3>],
  "principleScore": <0-100>,
  "feedback": "2-3 sentences: highlight the strongest analogy, suggest how to improve the weakest, and comment on the universal principle"
}`
            );
            const text = result.response.text();
            return NextResponse.json(extractJSON(text));
        }

        // ── DETECT CROSS-MODEL CONNECTIONS ──
        if (body.type === 'detect_connections') {
            const mockConnections = {
                connections: [
                    { sourceId: 'a', targetId: 'b', relationship: 'reinforces', explanation: 'These models compound when applied together.' },
                ],
            };
            const mock = hasApiKeyOrMock(mockConnections);
            if (mock) return mock;

            const cards = body.modelCards || [];
            if (cards.length < 2) {
                return NextResponse.json({ connections: [] });
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const cardSummaries = cards.map((c, i) => `[${i}] ID:${c.id} | "${c.name}" (${c.pillar}) — ${c.definition}. Mechanism: ${c.coreMechanism}`).join('\n');
            const result = await model.generateContent(
                `You are an expert in mental models and systems thinking. Analyze these mental model cards and find meaningful connections between them.

MODEL CARDS:
${cardSummaries}

Find relationships between pairs of models. Types of relationships:
- "reinforces": Model A strengthens Model B's effect
- "contradicts": Models create tension or opposing predictions
- "extends": Model A is a special case or extension of Model B
- "enables": Model A creates conditions for Model B
- "complements": Models cover different aspects of the same phenomenon

Only report MEANINGFUL connections (not trivial ones). Maximum 5 connections.

Return JSON:
{
  "connections": [
    {
      "sourceId": "<id of first model>",
      "targetId": "<id of second model>",
      "relationship": "<type>",
      "explanation": "One sentence explaining the connection"
    }
  ]
}`
            );
            const text = result.response.text();
            return NextResponse.json(extractJSON(text));
        }

        // ── FOUNDER INSIGHT GENERATOR ──
        if (body.type === 'generate_founder_insight') {
            const mockInsight = {
                title: 'Decision Intelligence: Applying Incentives to Your Growth Strategy',
                insight: 'Your current growth strategy relies on users sharing organically, but you haven\'t aligned incentives for this behavior.',
                decision: 'Implement a referral reward system that gives both referrer and referee tangible value.',
                risk: 'Over-incentivizing referrals may attract low-quality users who churn quickly.',
                experiment: 'Run a 2-week A/B test: 50% of users get a referral prompt with reward vs. without. Measure 30-day retention of referred users.',
                secondOrderEffects: 'If referral quality is high, this creates a compounding growth loop. If quality is low, it increases support costs and dilutes community value.',
            };
            const mock = hasApiKeyOrMock(mockInsight);
            if (mock) return mock;

            const card = body.modelCard;
            if (!card) {
                return NextResponse.json({ error: 'Model card required' }, { status: 400 });
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const contextNote = body.startupContext
                ? `The founder's startup context: ${body.startupContext}`
                : 'No specific startup context provided — generate a general founder-applicable insight.';

            const result = await model.generateContent(
                `You are a world-class startup advisor who thinks in mental models. Generate a "Decision Intelligence Insight Document" by applying this mental model to the founder's business context.

MENTAL MODEL:
Name: ${card.name}
Definition: ${card.definition}
Core Mechanism: ${card.coreMechanism}
Action Rule: ${card.actionRule}
Examples: ${JSON.stringify(card.examples)}

CONTEXT: ${contextNote}

Generate a Decision Intelligence document that connects this mental model to actionable startup decisions.

Return JSON:
{
  "title": "Decision Intelligence: [Model] Applied to [Domain]",
  "insight": "The key insight when applying this model to your business (2-3 sentences)",
  "decision": "A specific, actionable decision this model suggests (1-2 sentences)",
  "risk": "The primary risk or blind spot of following this model here (1-2 sentences)",
  "experiment": "A concrete experiment to test this decision (2-3 sentences with measurable outcome)",
  "secondOrderEffects": "What happens after the first-order effect plays out (2-3 sentences)"
}`
            );
            const text = result.response.text();
            return NextResponse.json(extractJSON(text));
        }

        // ── DETECT CONFLICTS & AUTO-MERGE ──
        if (body.type === 'detect_conflicts') {
            const mockConflict = {
                hasConflict: true,
                conflictType: 'overlapping',
                conflictingCardId: 'mock-id',
                conflictingCardName: 'Existing Model',
                explanation: 'These models describe similar concepts from different angles.',
                mergedCard: {
                    name: 'Merged Model',
                    definition: 'A unified definition combining both perspectives.',
                    coreMechanism: 'The combined mechanism incorporating both models.',
                    limitations: 'Updated limitations considering both viewpoints.',
                    actionRule: 'A synthesized action rule.',
                    keyQuestion: 'What unified question does this answer?',
                },
            };
            const mock = hasApiKeyOrMock(mockConflict);
            if (mock) return mock;

            const newCard = body.newCard;
            const existingCards = body.existingCards || [];
            if (!newCard || existingCards.length === 0) {
                return NextResponse.json({ hasConflict: false });
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const cardSummaries = existingCards.map((c, i) =>
                `[${i}] ID:${c.id} | "${c.name}" — ${c.definition}. Mechanism: ${c.coreMechanism}`
            ).join('\n');

            const result = await model.generateContent(
                `You are an expert in mental models and epistemology. A user is creating a new mental model card. Check if it conflicts with, duplicates, or significantly overlaps any existing model cards.

NEW MODEL CARD:
Name: ${newCard.name}
Definition: ${newCard.definition}
Core Mechanism: ${newCard.coreMechanism}

EXISTING MODEL CARDS:
${cardSummaries}

Analyze whether the new card:
1. DUPLICATES an existing card (same model, different wording)
2. CONTRADICTS an existing card (opposing claims about how things work)
3. OVERLAPS significantly with an existing card (covers similar ground but with different focus)

If there IS a conflict/overlap/duplicate, generate a MERGED card that synthesizes both perspectives into a stronger, more complete model card.

If there is NO meaningful conflict, return hasConflict: false.

Return JSON:
{
  "hasConflict": boolean,
  "conflictType": "duplicate" | "contradicts" | "overlapping" | null,
  "conflictingCardId": "<id of the conflicting existing card>" | null,
  "conflictingCardName": "<name of conflicting card>" | null,
  "explanation": "1-2 sentences explaining the conflict/overlap" | null,
  "mergedCard": {
    "name": "Merged/synthesized model name",
    "definition": "Unified definition",
    "coreMechanism": "Combined mechanism",
    "limitations": "Updated limitations",
    "actionRule": "Synthesized action rule",
    "keyQuestion": "Unified key question"
  } | null
}`
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
