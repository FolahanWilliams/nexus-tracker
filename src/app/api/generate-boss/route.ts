import { GoogleGenerativeAI, DynamicRetrievalMode } from '@google/generative-ai';
import { NextResponse } from 'next/server';

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
        const { uncompletedTasks, failedHabits, playerContext } = await request.json();

        if (!process.env.GOOGLE_API_KEY) {
            console.warn("No GOOGLE_API_KEY found.");
            return NextResponse.json({
                name: "The Generic Procrastinator",
                description: "A shadowy figure forged from the tasks you put off until tomorrow.",
                difficulty: "Medium",
                hp: 500,
                maxHp: 500,
                xpReward: 150,
                goldReward: 75,
                isMock: true
            });
        }

        // Google Search Grounding lets the AI reference real-world events and trends
        // to create culturally relevant, topical boss battles.
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            tools: [{
                googleSearch: {},
            } as any],
        });

        const systemPrompt = `You are the Dungeon Master for QuestFlow RPG.
Generate a Custom Boss Battle based on the player's recent struggles.

You have access to Google Search. Use it to:
- Reference current events, trending topics, or real-world challenges to make the boss feel timely and relevant
- Create boss names and descriptions that feel connected to today's world (e.g., "The Algorithm Overlord" if they struggle with social media distractions)

Context:
- Player Level: ${playerContext?.level || 1}
- Uncompleted Tasks: ${uncompletedTasks?.map((t: { title: string }) => t.title).join(', ') || 'None'}
- Failed/Ignored Habits: ${failedHabits?.map((h: { name: string }) => h.name).join(', ') || 'None'}

Create a boss themed around these struggles (e.g., if they struggle with fitness tasks, the boss could be "The Couch Potato Leviathan").

Scale HP to Player Level (Level ${playerContext?.level || 1}):
- Level 1-5: 200-500 HP
- Level 6-15: 500-1500 HP
- Level 16+: 1500+ HP

Output ONLY a valid JSON object with:
- name: string (The Boss's name)
- description: string (Short lore description tying into the uncompleted tasks)
- difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic'
- hp: number (Base HP)
- xpReward: number (Base XP, usually 100-500)
- goldReward: number (Base Gold, usually 50-200)
`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        const data = extractJSON(text) as Record<string, unknown>;

        return NextResponse.json({
            ...data,
            maxHp: data.hp, // Initialize maxHp to equal hp
            startsAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            completed: false,
            failed: false
        });
    } catch (error) {
        console.error('Gemini Boss Gen Error:', error);
        return NextResponse.json({
            name: "The Chaos Anomaly",
            description: "A glitch in the matrix blocking your path.",
            difficulty: "Hard",
            hp: 800,
            maxHp: 800,
            xpReward: 200,
            goldReward: 100,
            startsAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            completed: false,
            failed: false,
            isMock: true,
            error: 'AI unavailable'
        });
    }
}
