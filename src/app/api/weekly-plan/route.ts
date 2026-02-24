import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { tasks, chains, reflections, habits, playerContext } = await request.json();

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({
                briefing: "Your weekly plan is ready! Focus on clearing your highest-priority quests first.",
                days: [
                    { day: "Monday", focus: "Start with your most important incomplete quest.", tasks: [] },
                    { day: "Tuesday", focus: "Continue momentum from Monday.", tasks: [] },
                    { day: "Wednesday", focus: "Mid-week check-in. Tackle any blocked items.", tasks: [] },
                    { day: "Thursday", focus: "Push through harder quests while energy is still high.", tasks: [] },
                    { day: "Friday", focus: "Wrap up lingering tasks and reflect on progress.", tasks: [] },
                ],
                insight: "Keep your streaks alive and focus on one Epic quest at a time.",
                isMock: true
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const incompleteTasks = tasks?.filter((t: { completed: boolean }) => !t.completed) || [];
        const recentReflections = reflections?.slice(0, 7) || [];

        const systemPrompt = `You are "Hoot", the strategic AI planner for QuestFlow RPG.
Your job is to create a personalized weekly productivity strategy.

Player Context:
- Name: ${playerContext?.name || 'Adventurer'}
- Level: ${playerContext?.level || 1}
- Class: ${playerContext?.characterClass || 'Novice'}
- Current Streak: ${playerContext?.streak || 0} days

Incomplete Quests (${incompleteTasks.length}):
${incompleteTasks.map((t: { title: string; difficulty: string; category: string; duration?: string }) =>
            `- "${t.title}" [${t.difficulty}] [${t.category}]${t.duration ? ` [${t.duration}]` : ''}`
        ).join('\n') || 'None'}

Active Quest Chains:
${chains?.filter((c: { completed: boolean }) => !c.completed).map((c: { name: string; currentStep: number; steps: unknown[] }) =>
            `- "${c.name}" (Step ${c.currentStep + 1}/${c.steps.length})`
        ).join('\n') || 'None'}

Habit Streaks:
${habits?.map((h: { name: string; streak: number }) => `- ${h.name}: ${h.streak}-day streak`).join('\n') || 'None'}

Recent Reflections (energy patterns):
${recentReflections.map((r: { date: string; stars: number; note: string }) =>
            `- ${r.date}: Energy ${r.stars}/5 — "${r.note}"`
        ).join('\n') || 'No reflections yet.'}

Create a strategic weekly plan. Output ONLY valid JSON with:
- briefing: String. A 2-3 sentence motivational overview of the week ahead.
- days: Array of 5 objects (Mon-Fri), each with:
  - day: String (e.g., "Monday")
  - focus: String. One sentence describing the day's theme/priority.
  - tasks: Array of strings — specific quest titles or actions to do that day.
- insight: String. One actionable insight based on their energy/reflection patterns (e.g., "Your energy dips on Thursdays — schedule lighter tasks").

Distribute tasks intelligently based on difficulty, duration, and energy patterns.
Prioritize Epic/Hard quests on high-energy days and Easy quests on recovery days.`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        const data = JSON.parse(text);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Weekly Plan Error:', error);
        return NextResponse.json({
            briefing: "Couldn't generate your plan right now. Focus on your highest-priority quest!",
            days: [],
            insight: "Try again later when the AI is available.",
            error: 'AI unavailable'
        }, { status: 500 });
    }
}
