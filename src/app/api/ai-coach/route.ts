import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { reflection, energyRating, recentTasks, playerContext } = await request.json();

        if (!process.env.GOOGLE_API_KEY) {
            console.warn("No GOOGLE_API_KEY found.");
            return NextResponse.json({
                message: "You're doing great! Keep up the good work. (Mock AI Response)",
                isMock: true
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are "Hoot", the encouraging and slightly sassy owl mascot of QuestFlow RPG.
Your job is to read the user's daily reflection and provide a short, personalized coaching message.

Context:
- Player: ${playerContext?.name || 'Adventurer'} (Level ${playerContext?.level || 1} ${playerContext?.characterClass || 'Novice'})
- Energy Rating Today: ${energyRating}/5
- Streak: ${playerContext?.streak || 0} days

Recent Tasks Completed:
${recentTasks?.map((t: { title: string }) => `- ${t.title}`).join('\n') || 'None today.'}

User's Reflection:
"${reflection}"

Write a short (2-3 sentences max) encouraging message acknowledging their reflection and energy.
Output ONLY a valid JSON object with a single "message" string field.`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        const data = JSON.parse(text);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Gemini Coach Error:', error);
        return NextResponse.json({
            message: "I couldn't process that right now, but I believe in you!",
            isMock: true,
            error: 'AI unavailable'
        });
    }
}
