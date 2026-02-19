import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

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
                    { title: 'Step 1: Preparation', description: 'Get everything ready' },
                    { title: 'Step 2: Execution', description: 'Do the hard work' },
                    { title: 'Step 3: Review', description: 'Make sure it is done right' },
                ],
                reward: { xp: 200, gold: 100 },
                isMock: true
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are a Gamified Productivity AI for QuestFlow RPG.
The user wants to accomplish a large project or goal. Your job is to break this goal down into a "Quest Chain" consisting of multiple logical steps.

Output ONLY a valid JSON object with the following properties:
- name: String. A cool, RPG-styled name for this overall quest chain (e.g. "The Great refactoring", "Path to Fluency").
- description: String. A short, motivating description of what this chain aims to achieve.
- difficulty: String. Must be exactly 'Easy', 'Medium', 'Hard', or 'Epic'.
- steps: Array of Objects. Each object must have:
  - title: String. Actionable task name.
  - description: String. Brief details on how to complete it.
- reward: Object containing:
  - xp: Number. Base it on the total effort of all steps combined (e.g. 50-500).
  - gold: Number. Usually half of XP (e.g. 25-250).

Generate a quest chain for the following user goal:`;

        const result = await model.generateContent(`${systemPrompt}\n\nUser Goal: ${prompt}`);
        const response = result.response;
        const text = response.text();

        const data = JSON.parse(text);

        // Basic validation
        const validDifficulties = ['Easy', 'Medium', 'Hard', 'Epic'];
        if (!validDifficulties.includes(data.difficulty)) data.difficulty = 'Medium';
        if (typeof data.reward?.xp !== 'number') data.reward = { xp: 100, gold: 50 };

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
