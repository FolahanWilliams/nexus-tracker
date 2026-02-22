import { GoogleGenerativeAI, DynamicRetrievalMode } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

/**
 * Extract JSON from a Gemini response that may contain markdown fences or prose.
 */
function extractJSON(text: string): unknown {
    try { return JSON.parse(text); } catch { /* continue */ }
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
        try { return JSON.parse(fenced[1].trim()); } catch { /* continue */ }
    }
    const braces = text.match(/\{[\s\S]*\}/);
    if (braces) {
        try { return JSON.parse(braces[0]); } catch { /* continue */ }
    }
    throw new Error('Could not extract JSON from response');
}

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
            console.warn("No GOOGLE_API_KEY found. Using fallback chain.");
            return NextResponse.json({
                name: `[MOCK] Campaign: ${prompt}`,
                description: `A generated campaign for ${prompt}`,
                difficulty: 'Medium',
                steps: [
                    {
                        title: 'Step 1: Preparation',
                        description: 'Get everything ready before diving in.',
                        branches: [
                            { label: 'Plan Thoroughly', description: 'Create a detailed outline and gather all resources first.', xpBonus: 30 },
                            { label: 'Start Lean', description: 'Begin with the minimum setup and adapt as you go.', xpBonus: 20 },
                        ]
                    },
                    { title: 'Step 2: Execution', description: 'Do the hard work and push through challenges.' },
                    { title: 'Step 3: Review', description: 'Reflect on what was accomplished and refine your approach.' },
                ],
                reward: { xp: 200, gold: 100 },
                isMock: true
            });
        }

        // Google Search Grounding lets the AI research the user's project topic
        // to create steps that reference real tools, frameworks, and best practices.
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            tools: [{
                googleSearch: {
                    dynamicRetrievalConfig: {
                        mode: DynamicRetrievalMode.MODE_DYNAMIC,
                        dynamicThreshold: 0.3, // Low threshold = search more often
                    },
                },
            } as any],
        });

        const systemPrompt = `You are a Gamified Productivity AI for QuestFlow RPG.
The user wants to accomplish a large project or goal. Your job is to break this goal down into a "Quest Chain" consisting of multiple logical steps, with optional branching paths to give the player meaningful choices.

You have access to Google Search. Use it to:
- Research the user's project topic for current best practices, tools, and resources
- Make steps reference real, up-to-date techniques and tools
- Ensure the chain is accurate and actionable based on current information

Output ONLY a valid JSON object with the following properties:
- name: String. A cool, RPG-styled name for this overall quest chain (e.g. "The Great Refactoring", "Path to Fluency").
- description: String. A short, motivating description of what this chain aims to achieve.
- difficulty: String. Must be exactly 'Easy', 'Medium', 'Hard', or 'Epic'.
- steps: Array of Objects. Between 3 and 6 steps. Each step object must have:
  - title: String. Actionable task name.
  - description: String. Brief details on how to complete it.
  - branches: (Optional) Array of 2 branch objects, included on 1-2 steps where the player has a meaningful choice of approach. Each branch must have:
    - label: String. Short name for this approach (e.g. "Deep Dive", "Quick Review").
    - description: String. One sentence explaining this approach.
    - xpBonus: Number. Extra XP for choosing this path (10-50).
- reward: Object containing:
  - xp: Number. Base it on the total effort of all steps combined (e.g. 50-500).
  - gold: Number. Usually half of XP (e.g. 25-250).

Example of a step with branches:
{
  "title": "Learn the fundamentals",
  "description": "Build your foundation before advancing.",
  "branches": [
    { "label": "Deep Study", "description": "Read documentation and take detailed notes for thorough understanding.", "xpBonus": 30 },
    { "label": "Practice First", "description": "Jump straight into exercises and learn by doing.", "xpBonus": 20 }
  ]
}

Generate a quest chain for the following user goal:`;

        const result = await model.generateContent(`${systemPrompt}\n\nUser Goal: ${prompt}`);
        const response = result.response;
        const text = response.text();

        const data = extractJSON(text) as Record<string, unknown>;

        // Basic validation
        const validDifficulties = ['Easy', 'Medium', 'Hard', 'Epic'];
        if (!validDifficulties.includes(data.difficulty as string)) data.difficulty = 'Medium';
        const reward = data.reward as { xp?: number; gold?: number } | undefined;
        if (typeof reward?.xp !== 'number') data.reward = { xp: 100, gold: 50 };

        return NextResponse.json(data);
    } catch (error) {
        console.error('Gemini Generate Chain Error:', error);
        return NextResponse.json({
            name: `Project: ${prompt}`,
            description: 'Failed to generate AI steps.',
            difficulty: 'Medium',
            steps: [
                { title: 'Step 1', description: 'Start the task' }
            ],
            reward: { xp: 50, gold: 25 },
            error: 'AI unavailable'
        }, { status: 500 });
    }
}
