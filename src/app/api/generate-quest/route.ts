import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

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

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
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

        const systemPrompt = `You are a Gamified Productivity AI for QuestFlow RPG. Break down the user's goal into 3-5 executable "quests" (tasks).
For each quest, output a JSON object with:
- title: Actionable, specific task name (written like a real RPG quest objective)
- xp: Experience points (10=Easy, 25=Medium, 50=Hard, 100=Epic)
- difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic'

Scale difficulty based on effort required. Mix difficulties for variety.
${playerContext}
Output ONLY a valid JSON object with a "quests" array. No other text.`;

        const result = await model.generateContent(`${systemPrompt}\n\nUser Goal: ${prompt}`);
        const response = result.response;
        const text = response.text();

        const data = JSON.parse(text);

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
