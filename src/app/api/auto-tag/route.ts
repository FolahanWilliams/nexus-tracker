import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { TaskCategory } from '@/store/useGameStore';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { title } = await request.json();

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
            console.warn("No GOOGLE_API_KEY found. Using fallback tagging.");
            return NextResponse.json({
                difficulty: 'Medium',
                category: 'Other',
                xpReward: 25,
                isMock: true
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are a Gamified Productivity AI for QuestFlow RPG.
Your job is to analyze a short task title and determine its optimal metadata.

Output ONLY a valid JSON object with the following properties:
- difficulty: String. Must be exactly 'Easy', 'Medium', 'Hard', or 'Epic'.
- category: String. Must be exactly 'Study', 'Health', 'Creative', 'Work', 'Social', 'Personal', or 'Other'.
- xpReward: Number. Scale with difficulty (10 for Easy, 25 for Medium, 50 for Hard, 100 for Epic).

Examples:
- "Run 5k" -> {"difficulty": "Hard", "category": "Health", "xpReward": 50}
- "Check emails" -> {"difficulty": "Easy", "category": "Work", "xpReward": 10}
- "Write chapter 1 of novel" -> {"difficulty": "Epic", "category": "Creative", "xpReward": 100}

Analyze the following task:`;

        const result = await model.generateContent(`${systemPrompt}\n\nTask: ${title}`);
        const response = result.response;
        const text = response.text();

        const data = JSON.parse(text);

        // Basic validation
        const validDifficulties = ['Easy', 'Medium', 'Hard', 'Epic'];
        const validCategories = ['Study', 'Health', 'Creative', 'Work', 'Social', 'Personal', 'Other'];

        if (!validDifficulties.includes(data.difficulty)) data.difficulty = 'Medium';
        if (!validCategories.includes(data.category)) data.category = 'Other';
        if (typeof data.xpReward !== 'number') data.xpReward = 25;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Gemini Auto-Tag Error:', error);
        return NextResponse.json({
            difficulty: 'Medium',
            category: 'Other',
            xpReward: 25,
            error: 'AI unavailable'
        }, { status: 500 });
    }
}
