import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

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
            model: "gemini-3-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are a Gamified Productivity AI. Break down the user's goal into 3-5 executable "quests" (tasks).
    For each quest, output a JSON object with:
    - title: Actionable task name
    - xp: Experience points (10-100 based on difficulty)
    - difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic'
    
    Output a JSON object with a "quests" array containing these objects.`;

        const result = await model.generateContent(`${systemPrompt}\n\nUser Goal: ${prompt}`);
        const response = await result.response;
        const text = response.text();

        const data = JSON.parse(text);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Gemini Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate quests' }, { status: 500 });
    }
}
