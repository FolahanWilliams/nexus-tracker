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
        const { prompt, context } = await request.json();

        if (!process.env.GOOGLE_API_KEY) {
            console.warn("No GOOGLE_API_KEY found.");
            return NextResponse.json({
                quests: [
                    { title: `[MOCK] Research: ${prompt}`, xp: 20, difficulty: 'Easy' },
                    { title: `[MOCK] Plan: ${prompt}`, xp: 50, difficulty: 'Medium' },
                    { title: `[MOCK] Execute: ${prompt}`, xp: 100, difficulty: 'Hard' }
                ],
                isMock: true
            });
        }

        // Google Search Grounding lets the AI research the user's goal in real-time
        // so quests reference accurate, current information (e.g., latest docs, tutorials).
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            tools: [{
                googleSearch: {},
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- googleSearch not in SDK types
            } as any],
        });

        // Build player context string if provided
        const playerContext = context ? `
Player Profile:
- Name: ${context.name || 'Unknown'}
- Class: ${context.characterClass || 'None'}
- Level: ${context.level || 1}
- Total Quests Completed: ${context.totalQuestsCompleted || 0}
- Current Streak: ${context.streak || 0} days
Tailor the quests to suit a ${context.characterClass || 'general'} player at level ${context.level || 1}.` : '';

        const systemPrompt = `You are a Gamified Productivity AI for QuestFlow RPG. Break down the user's goal into 1-2 executable "quests" (tasks).

You have access to Google Search. Use it to:
- Research the user's goal topic for current, accurate information
- Make quests reference real tools, resources, or techniques that exist today
- If relevant, include a brief tip or link in the quest title or description

For each quest, output a JSON object with:
- title: Actionable, specific task name (written like a real RPG quest objective)
- xp: Experience points (10=Easy, 25=Medium, 50=Hard, 100=Epic)
- difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic'

Scale difficulty based on effort required. Focus on quality over quantity - generate only the most essential tasks.
${playerContext}
Output ONLY a valid JSON object with a "quests" array. No other text.`;

        const result = await model.generateContent(`${systemPrompt}\n\nUser Goal: ${prompt}`);
        const response = result.response;
        const text = response.text();

        const data = extractJSON(text);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Gemini Generation Error:', error);
        return NextResponse.json({
            quests: [
                { title: 'Plan your approach', xp: 10, difficulty: 'Easy' },
                { title: 'Execute the main task', xp: 50, difficulty: 'Hard' },
                { title: 'Review and reflect', xp: 25, difficulty: 'Medium' }
            ],
            isMock: true,
            error: 'AI unavailable — using fallback quests'
        });
    }
}
