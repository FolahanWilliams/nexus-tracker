/**
 * Akrasia Coach API — Gemini-backed helpers for closing the intention-action gap.
 *
 * Actions:
 *   - extract_micro_action : decompose a vague intention into a single ≤2-min physical next action
 *   - suggest_if_then      : infer implementation intentions from recent bail patterns
 *   - draft_identity       : help the user draft an identity-line statement
 *   - stage_template       : pre-draft an outreach template so there's zero blank-page friction
 *   - extract_and_diff     : parse "wanted" + "did" text into typed entities (person / organization /
 *                            accelerator / book / target) for the Personal Coach knowledge graph
 */

import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput } from '@/lib/sanitize';

type CoachAction =
    | 'extract_micro_action'
    | 'suggest_if_then'
    | 'draft_identity'
    | 'stage_template'
    | 'extract_and_diff';

interface CoachRequestBody {
    action: CoachAction;
    intention?: string;
    wanted?: string;
    did?: string;
    bails?: Array<{ chose: string; instead: string; emotion: string; trigger: string }>;
    vibes?: string;              // optional tone hints for draft_identity
    target?: string;             // for stage_template — e.g. "YC accelerator CEO email"
    context?: string;            // extra free-form context
}

function mockForAction(action: CoachAction) {
    switch (action) {
        case 'extract_micro_action':
            return {
                microAction: {
                    text: 'Open the Notion outreach template and paste one founder name from row 1.',
                    estimatedMinutes: 2,
                },
            };
        case 'suggest_if_then':
            return {
                suggestions: [
                    { trigger: 'When I unlock my phone before 10am', response: 'I open QuestFlow and complete today\'s micro-action first.' },
                ],
            };
        case 'draft_identity':
            return {
                drafts: [
                    "I'm the kind of founder who ships one outreach email before coffee.",
                    "I'm someone who trades 30 minutes of TikTok for one meaningful conversation a day.",
                    "I vote daily for the operator who writes before scrolling.",
                ],
            };
        case 'stage_template':
            return {
                template: 'Hi [Name],\n\nI\'m building [one line on your company] and saw your work on [specific detail]. Would love 15 minutes to get your take on [specific question].\n\nThanks,\n[You]',
            };
        case 'extract_and_diff':
            return {
                wantedEntities: [],
                didEntities: [],
                missed: [],
                honored: [],
                gapScore: 0,
            };
    }
}

export const POST = withAuth(async (request) => {
    try {
        const body = (await request.json()) as CoachRequestBody;
        const action = body.action;

        if (!action) {
            return NextResponse.json({ error: 'action is required' }, { status: 400 });
        }

        const mock = hasApiKeyOrMock(mockForAction(action) as Record<string, unknown>);
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });

        let prompt = '';

        switch (action) {
            case 'extract_micro_action': {
                const intention = sanitizePromptInput(body.intention, 1000);
                if (!intention) {
                    return NextResponse.json({ error: 'intention is required' }, { status: 400 });
                }
                prompt = `You are a brutally practical productivity coach helping a founder close the intention–action gap.

The user has a vague intention: "${intention}"

Your job: return a SINGLE physical, stupidly-small next action that takes 2 minutes or less and that they can start RIGHT NOW from wherever they are.

Rules:
- It must be a concrete physical/digital action (open X, type Y, click Z, pick up N and move it to M).
- It MUST be ≤ 2 minutes of real wall-clock time.
- NO plans, NO "research X", NO "think about Y". Only doing.
- Location- or tool-specific when possible (Gmail, Notion, phone, desk, calendar).
- No more than 20 words.

Output JSON:
{ "microAction": { "text": "string", "estimatedMinutes": number } }`;
                break;
            }

            case 'suggest_if_then': {
                const bails = Array.isArray(body.bails) ? body.bails.slice(0, 20) : [];
                if (bails.length === 0) {
                    return NextResponse.json({ suggestions: [] });
                }
                const bailText = bails.map((b, i) =>
                    `${i + 1}. chose="${sanitizePromptInput(b.chose, 100)}" instead_of="${sanitizePromptInput(b.instead, 100)}" emotion=${sanitizePromptInput(b.emotion, 30)} trigger="${sanitizePromptInput(b.trigger, 200)}"`
                ).join('\n');
                prompt = `You are an implementation-intentions coach.

Here are the user's recent defection ("bail") events — moments they chose distraction over their goals:

${bailText}

Identify repeating patterns (time of day, emotion, trigger) and propose 2-4 "if-then" implementation intention plans they can pre-commit to. Each should be specific, automatic-feeling, and directly address a pattern you see.

Output JSON:
{ "suggestions": [{ "trigger": "When …", "response": "I will …" }] }`;
                break;
            }

            case 'draft_identity': {
                const vibes = sanitizePromptInput(body.vibes, 500);
                const context = sanitizePromptInput(body.context, 500);
                prompt = `Help the user write an identity-based statement — the sentence they will repeat every day as a lens for every action.

${vibes ? `Vibes they want: ${vibes}` : ''}
${context ? `Context: ${context}` : ''}

Rules:
- Format: "I'm the kind of [role] who [specific behavior]" or similar.
- Behavior must be concrete and daily-frequency (not a one-time goal).
- 12-25 words.
- Slightly confrontational / uncompromising — this is their own internal standard, not marketing copy.
- Produce 3 distinct drafts for them to choose from.

Output JSON:
{ "drafts": ["string", "string", "string"] }`;
                break;
            }

            case 'stage_template': {
                const target = sanitizePromptInput(body.target, 500);
                const context = sanitizePromptInput(body.context, 1000);
                if (!target) {
                    return NextResponse.json({ error: 'target is required' }, { status: 400 });
                }
                prompt = `Draft a short, copy-pasteable outreach message so the user has zero blank-page friction when their focus block opens.

Target: ${target}
${context ? `Context about them / the sender: ${context}` : ''}

Rules:
- 60-140 words, plain text.
- Use [Name] and [specific detail] placeholders where personalization is needed.
- Lead with one concrete reason you're reaching out (never "I hope this finds you well").
- One specific ask, one clear next step, no fluff.

Output JSON:
{ "template": "string" }`;
                break;
            }

            case 'extract_and_diff': {
                const wanted = sanitizePromptInput(body.wanted, 2000);
                const did = sanitizePromptInput(body.did, 2000);
                if (!wanted && !did) {
                    return NextResponse.json({ error: 'wanted or did required' }, { status: 400 });
                }
                prompt = `You extract ambition entities from a daily log and compute a gap.

The user wrote two things for today.

WANTED (what they said they'd do):
"${wanted}"

DID (what they actually did):
"${did}"

Extract every distinct ambition entity mentioned in either text. Entity types:
- person           : named individuals ("Garry Tan", "Michael Seibel")
- organization     : companies / funds ("Sequoia", "OpenAI")
- accelerator      : YC, Techstars, a16z Speedrun, etc.
- book             : named books ("Zero to One", "Atomic Habits")
- target           : any generic actionable target ("5 cold emails", "20 pages")

For each entity return:
- label       : normalized lowercase kebab-case (e.g. "garry-tan", "zero-to-one")
- display     : the human-readable name ("Garry Tan")
- type        : one of the types above
- inWanted    : boolean
- inDid       : boolean
- action      : "contacted" | "wanted_to_contact" | "read" | "wanted_to_read" | "mentioned"

Also return:
- honored : labels that appeared in BOTH wanted and did
- missed  : labels wanted but not did
- gapScore: 0-1 where 0 = fully delivered, 1 = full miss

Output JSON:
{
  "entities": [{ "label": "string", "display": "string", "type": "string", "inWanted": boolean, "inDid": boolean, "action": "string" }],
  "honored": ["string"],
  "missed": ["string"],
  "gapScore": number
}`;
                break;
            }

            default:
                return NextResponse.json({ error: 'unknown action' }, { status: 400 });
        }

        const result = await model.generateContent(prompt);
        const data = extractJSON(result.response.text()) as Record<string, unknown>;
        return NextResponse.json(data);
    } catch (error) {
        logger.error('Akrasia coach failed', 'akrasia-coach', error);
        return NextResponse.json(
            { error: 'AI unavailable', isMock: true },
            { status: 500 }
        );
    }
}, { rateLimitMax: 30 });
