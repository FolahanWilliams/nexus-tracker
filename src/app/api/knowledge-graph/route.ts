import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';

/**
 * POST: Extract concepts from text (daily logs, reflections, etc.) using Gemini.
 * Returns new/updated nodes and edges.
 */
export async function POST(request: Request) {
    try {
        const { text, source, sourceId, existingLabels } = await request.json();

        const mock = hasApiKeyOrMock({
            concepts: [
                { label: 'productivity', category: 'personal-development', confidence: 0.9 },
                { label: 'goal-setting', category: 'personal-development', confidence: 0.85 },
            ],
            relationships: [
                { from: 'productivity', to: 'goal-setting', type: 'co_occurrence', weight: 0.8 },
            ],
        });
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { responseMimeType: 'application/json' },
        });

        const prompt = `You are a concept extraction engine for a knowledge graph.

Given the following text from a user's ${source} entry, extract discrete concepts, skills, and topics mentioned.

Text:
"${text}"

${existingLabels?.length ? `Existing nodes in the user's knowledge graph (reuse these labels when possible, detect synonyms):
${existingLabels.join(', ')}` : ''}

Rules:
- Extract 1-8 distinct concepts/skills/topics. Don't over-extract trivial words.
- Normalize labels to lowercase, use hyphens for multi-word (e.g., "machine-learning", "react-hooks").
- Detect synonyms with existing labels (e.g., "React" = "ReactJS" = "react").
- Assign a category: tech, health, finance, personal-development, creative, science, language, social, career, other.
- Rate confidence 0-1 for each extraction.
- Identify relationships between extracted concepts (co_occurrence type).
- If a concept is clearly a prerequisite for another, mark it as "prerequisite" type.

Output JSON:
{
  "concepts": [{ "label": "string", "category": "string", "confidence": number }],
  "relationships": [{ "from": "label", "to": "label", "type": "co_occurrence" | "semantic" | "prerequisite", "weight": number }]
}`;

        const result = await model.generateContent(prompt);
        const data = extractJSON(result.response.text()) as {
            concepts: { label: string; category: string; confidence: number }[];
            relationships: { from: string; to: string; type: string; weight: number }[];
        };

        return NextResponse.json(data);
    } catch (error) {
        logger.error('Concept extraction failed', 'knowledge-graph', error);
        return NextResponse.json({
            concepts: [],
            relationships: [],
            isMock: true,
            error: 'AI unavailable',
        }, { status: 500 });
    }
}

/**
 * GET: Compute semantic similarity between concepts using Gemini.
 * Query params: ?concepts=a,b,c,d&existing=e,f,g
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const concepts = searchParams.get('concepts')?.split(',').filter(Boolean) || [];
        const existing = searchParams.get('existing')?.split(',').filter(Boolean) || [];

        if (concepts.length === 0) {
            return NextResponse.json({ similarities: [] });
        }

        const mock = hasApiKeyOrMock({ similarities: [] });
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { responseMimeType: 'application/json' },
        });

        const allConcepts = [...new Set([...concepts, ...existing])];
        if (allConcepts.length < 2) {
            return NextResponse.json({ similarities: [] });
        }

        const prompt = `Rate the semantic similarity between these concept pairs on a 0-1 scale.
Only return pairs with similarity >= 0.5.

Concepts: ${allConcepts.join(', ')}

Focus on pairs between new concepts (${concepts.join(', ')}) and all concepts.

Output JSON:
{
  "similarities": [{ "from": "label", "to": "label", "score": number }]
}`;

        const result = await model.generateContent(prompt);
        const data = extractJSON(result.response.text());
        return NextResponse.json(data);
    } catch (error) {
        logger.error('Similarity computation failed', 'knowledge-graph', error);
        return NextResponse.json({ similarities: [], isMock: true }, { status: 500 });
    }
}
