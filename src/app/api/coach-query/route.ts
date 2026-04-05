/**
 * Coach Query API — answers natural-language questions against the user's
 * ambition knowledge graph, produces Sunday "letter from your future self",
 * and generates personalized weekly plans against named targets.
 *
 * Modes:
 *   - query   : NL → structured filter over graph nodes/edges, returns an answer
 *   - confront: Gemini writes a 3-paragraph letter from the user's future self
 *   - plan    : given a goal, returns a week-by-week target list
 */

import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput } from '@/lib/sanitize';

interface CoachQueryBody {
    mode: 'query' | 'confront' | 'plan';
    question?: string;
    goal?: string;
    // Compact user snapshot (only what's needed — caller should project, not dump)
    identityLine?: string | null;
    ambitionNodes?: Array<{
        label: string;
        display?: string;
        type: string;
        mentionCount: number;
        lastSeenAt: string;
    }>;
    ambitionEdges?: Array<{
        from: string;
        to: string;
        type: string;
    }>;
    recentGaps?: Array<{
        date: string;
        wanted: string;
        did: string;
        gapScore: number;
        missed: string[];
        honored: string[];
    }>;
    recentBails?: Array<{
        date: string;
        chose: string;
        instead: string;
        emotion: string;
    }>;
    voteTally?: { for: number; against: number };
}

function mockFor(mode: string) {
    if (mode === 'query') {
        return {
            answer: 'Mock mode: add a GOOGLE_API_KEY to enable real coach queries. In the meantime, your graph shows 0 contacted and 0 wanted entities.',
            matchedNodes: [] as string[],
        };
    }
    if (mode === 'confront') {
        return {
            letter: "Dear present self,\n\nI'm writing from a year ahead. I know the week felt fine. It wasn't. You said you'd reach out to five accelerators. You reached one. The distance between us is not time — it's the seventeen conversations you didn't have.\n\nYou don't need more advice. You need one email before coffee tomorrow. That's the entire gap.\n\n— Future you",
        };
    }
    return {
        weeks: [
            { week: 1, focus: 'Named outreach: 5 targets', actions: ['Draft template', 'Send 5 cold emails'] },
        ],
    };
}

export const POST = withAuth(async (request) => {
    try {
        const body = (await request.json()) as CoachQueryBody;
        const mode = body.mode;
        if (!mode) return NextResponse.json({ error: 'mode is required' }, { status: 400 });

        const mock = hasApiKeyOrMock(mockFor(mode) as Record<string, unknown>);
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });

        // Compact the payload so prompts stay under control
        const nodes = (body.ambitionNodes ?? []).slice(0, 200);
        const edges = (body.ambitionEdges ?? []).slice(0, 400);
        const gaps = (body.recentGaps ?? []).slice(-14);
        const bails = (body.recentBails ?? []).slice(-20);

        const snapshot = `
IDENTITY LINE: ${body.identityLine ? `"${sanitizePromptInput(body.identityLine, 300)}"` : '(not set)'}
VOTE TALLY: ${body.voteTally ? `${body.voteTally.for} for / ${body.voteTally.against} against` : '(none)'}

AMBITION NODES (${nodes.length}):
${nodes.map((n) => `- [${n.type}] ${n.display || n.label} (mentions: ${n.mentionCount}, last: ${n.lastSeenAt.slice(0, 10)})`).join('\n')}

AMBITION EDGES (${edges.length}):
${edges.map((e) => `- ${e.from} --${e.type}--> ${e.to}`).join('\n')}

RECENT DAILY GAPS:
${gaps.map((g) => `- ${g.date} gap=${g.gapScore.toFixed(2)} wanted="${sanitizePromptInput(g.wanted, 200)}" did="${sanitizePromptInput(g.did, 200)}" missed=[${g.missed.join(', ')}] honored=[${g.honored.join(', ')}]`).join('\n')}

RECENT BAILS:
${bails.map((b) => `- ${b.date} chose=${sanitizePromptInput(b.chose, 50)} instead_of=${sanitizePromptInput(b.instead, 50)} emotion=${b.emotion}`).join('\n')}
`;

        let prompt = '';

        if (mode === 'query') {
            const question = sanitizePromptInput(body.question, 500);
            if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
            prompt = `You are the user's personal coach. Answer the question below using ONLY the snapshot of their ambition graph and recent activity. Be direct, confrontational where honest, and cite specific names from the graph when possible. No fluff.

${snapshot}

USER QUESTION:
"${question}"

Output JSON:
{ "answer": "string (2-5 sentences)", "matchedNodes": ["label", ...] }`;
        } else if (mode === 'confront') {
            prompt = `You are writing a short letter from the user's FUTURE SELF — one year ahead — back to the user reading this today. Tone: warm but uncompromising. No motivational platitudes. Cite specific missed names / books / targets from the snapshot. 3 short paragraphs, ~180 words total.

${snapshot}

Output JSON:
{ "letter": "string" }`;
        } else if (mode === 'plan') {
            const goal = sanitizePromptInput(body.goal, 500);
            if (!goal) return NextResponse.json({ error: 'goal required' }, { status: 400 });
            prompt = `Build a 4-week plan to accomplish this goal, drawing on the user's existing ambition graph when relevant (prefer nodes already in the graph that are marked "wanted_to_contact" or "wanted_to_read" but not yet delivered).

GOAL: "${goal}"

${snapshot}

Rules:
- 4 weeks.
- Each week has a single focus and 3-5 concrete actions.
- If there are named ambition nodes still un-actioned, use those specific names in the actions.
- No abstract "research" or "think about" — only ship actions.

Output JSON:
{ "weeks": [{ "week": number, "focus": "string", "actions": ["string", ...] }] }`;
        } else {
            return NextResponse.json({ error: 'unknown mode' }, { status: 400 });
        }

        const result = await model.generateContent(prompt);
        const data = extractJSON(result.response.text()) as Record<string, unknown>;
        return NextResponse.json(data);
    } catch (error) {
        logger.error('Coach query failed', 'coach-query', error);
        return NextResponse.json({ error: 'AI unavailable', isMock: true }, { status: 500 });
    }
}, { rateLimitMax: 20 });
