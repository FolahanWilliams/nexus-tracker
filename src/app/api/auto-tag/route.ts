import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

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
                cleanTitle: title,
                difficulty: 'Medium',
                category: 'Other',
                xpReward: 25,
                duration: '1-hour',
                recurring: 'none',
                isMock: true
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are a Gamified Productivity AI for QuestFlow RPG.
Your job is to analyze a natural-language task description and determine ALL of its metadata.

Output ONLY a valid JSON object with the following properties:
- cleanTitle: String. A concise, actionable quest title derived from the user's input. Keep it under 80 characters. Remove filler words but preserve key details like names, numbers, and deadlines.
- difficulty: String. Must be exactly 'Easy', 'Medium', 'Hard', or 'Epic'. Base on effort, complexity, and time commitment.
- category: String. Must be exactly 'Study', 'Health', 'Creative', 'Work', 'Social', 'Personal', or 'Other'.
- xpReward: Number. Scale with difficulty (10 for Easy, 25 for Medium, 50 for Hard, 100 for Epic).
- duration: String. Estimated time commitment. Must be exactly one of: 'quick' (under 15 min), '1-hour', 'half-day', 'full-day', 'multi-day', 'week', 'month'.
- recurring: String. Whether this task should repeat. Must be exactly 'none', 'daily', or 'weekly'. Only set to daily/weekly if the text implies repetition.

Examples:
- "Run 5k" -> {"cleanTitle": "Run 5k", "difficulty": "Hard", "category": "Health", "xpReward": 50, "duration": "1-hour", "recurring": "none"}
- "Check emails every morning" -> {"cleanTitle": "Check emails", "difficulty": "Easy", "category": "Work", "xpReward": 10, "duration": "quick", "recurring": "daily"}
- "Reach out to three leads in the next week to sell my website service to local businesses" -> {"cleanTitle": "Reach out to 3 leads for website service sales", "difficulty": "Hard", "category": "Work", "xpReward": 50, "duration": "week", "recurring": "none"}
- "Write chapter 1 of novel" -> {"cleanTitle": "Write Chapter 1 of novel", "difficulty": "Epic", "category": "Creative", "xpReward": 100, "duration": "multi-day", "recurring": "none"}
- "Meditate for 10 minutes daily" -> {"cleanTitle": "Meditate for 10 minutes", "difficulty": "Easy", "category": "Health", "xpReward": 10, "duration": "quick", "recurring": "daily"}

Analyze the following task:`;

        const result = await model.generateContent(`${systemPrompt}\n\nTask: ${title}`);
        const response = result.response;
        const text = response.text();

        const data = JSON.parse(text);

        // Validation
        const validDifficulties = ['Easy', 'Medium', 'Hard', 'Epic'];
        const validCategories = ['Study', 'Health', 'Creative', 'Work', 'Social', 'Personal', 'Other'];
        const validDurations = ['quick', '1-hour', 'half-day', 'full-day', 'multi-day', 'week', 'month'];
        const validRecurring = ['none', 'daily', 'weekly'];

        if (!validDifficulties.includes(data.difficulty)) data.difficulty = 'Medium';
        if (!validCategories.includes(data.category)) data.category = 'Other';
        if (typeof data.xpReward !== 'number') data.xpReward = 25;
        if (!validDurations.includes(data.duration)) data.duration = '1-hour';
        if (!validRecurring.includes(data.recurring)) data.recurring = 'none';
        if (!data.cleanTitle || typeof data.cleanTitle !== 'string') data.cleanTitle = title;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Gemini Auto-Tag Error:', error);
        return NextResponse.json({
            cleanTitle: 'Untitled Quest',
            difficulty: 'Medium',
            category: 'Other',
            xpReward: 25,
            duration: '1-hour',
            recurring: 'none',
            error: 'AI unavailable'
        }, { status: 500 });
    }
}
