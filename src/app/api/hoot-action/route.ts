import { GoogleGenerativeAI, DynamicRetrievalMode, SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// ── Hoot's available actions (Gemini Function Declarations) ──────────────
const hootFunctions = [
    {
        name: 'add_task',
        description: 'Add a new quest/task to the user\'s quest list. Use when the user asks to create, add, or plan a task.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                title: { type: SchemaType.STRING, description: 'The task title, written as an actionable quest objective' },
                difficulty: { type: SchemaType.STRING, description: 'Task difficulty: Easy, Medium, Hard, or Epic' },
                category: { type: SchemaType.STRING, description: 'Task category: Study, Health, Creative, Social, Work, Personal, or Other' },
            },
            required: ['title'],
        },
    },
    {
        name: 'complete_task',
        description: 'Mark a task as completed. Use when the user says they finished or completed a task.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                taskName: { type: SchemaType.STRING, description: 'The name/title of the task to mark as complete (fuzzy match OK)' },
            },
            required: ['taskName'],
        },
    },
    {
        name: 'add_habit',
        description: 'Create a new habit to track daily. Use when the user wants to build a new habit.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                name: { type: SchemaType.STRING, description: 'The habit name' },
                icon: { type: SchemaType.STRING, description: 'A single emoji icon for the habit' },
                category: { type: SchemaType.STRING, description: 'Category: Study, Health, Creative, Social, Work, Personal, or Other' },
                xpReward: { type: SchemaType.NUMBER, description: 'XP reward for completing this habit (default 15)' },
            },
            required: ['name'],
        },
    },
    {
        name: 'complete_habit',
        description: 'Mark a habit as done for today. Use when the user says they did a habit.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                habitName: { type: SchemaType.STRING, description: 'The name of the habit to complete (fuzzy match OK)' },
            },
            required: ['habitName'],
        },
    },
    {
        name: 'add_goal',
        description: 'Create a new long-term goal with milestones. Use when the user mentions a big goal or objective.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                title: { type: SchemaType.STRING, description: 'Goal title' },
                description: { type: SchemaType.STRING, description: 'Brief goal description' },
                category: { type: SchemaType.STRING, description: 'Category: Study, Health, Creative, Social, Work, Personal, or Other' },
                timeframe: { type: SchemaType.STRING, description: 'Timeframe: daily, weekly, monthly, quarterly, yearly' },
                targetDate: { type: SchemaType.STRING, description: 'Target date in YYYY-MM-DD format' },
                milestones: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: 'List of milestone titles (2-5 milestones)',
                },
                xpReward: { type: SchemaType.NUMBER, description: 'XP reward for completing the goal (50-500)' },
            },
            required: ['title', 'description'],
        },
    },
    {
        name: 'set_daily_intention',
        description: 'Set the user\'s intention/focus for today along with energy level. Use when the user states their intention or how they feel.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                intention: { type: SchemaType.STRING, description: 'The daily intention text' },
                energyRating: { type: SchemaType.NUMBER, description: 'Energy level from 1-5' },
            },
            required: ['intention', 'energyRating'],
        },
    },
    {
        name: 'add_reflection',
        description: 'Submit a daily reflection note. Use when the user reflects on their day or shares how their day went.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                note: { type: SchemaType.STRING, description: 'The reflection note text' },
                stars: { type: SchemaType.NUMBER, description: 'How good the day was, 1-5 stars' },
            },
            required: ['note', 'stars'],
        },
    },
    {
        name: 'navigate',
        description: 'Suggest navigating to a specific page in the app. Use when the user asks to go somewhere or when another page would be helpful.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                page: { type: SchemaType.STRING, description: 'Page path: /, /quests, /habits, /goals, /focus, /reflection, /bosses, /chains, /analytics, /character, /inventory, /shop, /skills, /crafting, /achievements, /timeline, /settings' },
                reason: { type: SchemaType.STRING, description: 'Brief reason for suggesting this page' },
            },
            required: ['page'],
        },
    },
];

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
    return null;
}

// ── Page context descriptions ────────────────────────────────────────────
const PAGE_CONTEXT: Record<string, string> = {
    '/': 'Dashboard — overview of XP, level, streak, daily quests, and productivity score',
    '/quests': 'Quests — task list where users create and complete quests for XP',
    '/habits': 'Habits — daily habit tracker with streaks',
    '/goals': 'Goals — long-term goals with milestone tracking',
    '/focus': 'Focus Timer — Pomodoro-style focus sessions',
    '/reflection': 'Reflection — daily journaling with energy ratings and trend analysis',
    '/bosses': 'Boss Battles — AI-generated bosses themed around uncompleted tasks',
    '/chains': 'Quest Chains — multi-step projects with branching paths',
    '/analytics': 'Analytics — productivity charts and trends',
    '/character': 'Character — RPG profile, class selection, stats',
    '/inventory': 'Inventory — collected items and equipment',
    '/shop': 'Shop — spend gold and gems on rewards',
    '/skills': 'Skills — skill tree with upgrade paths',
    '/crafting': 'Crafting — combine items to create better gear',
    '/achievements': 'Achievements — unlockable badges and milestones',
    '/timeline': 'Timeline — upcoming events and deadlines',
    '/settings': 'Settings — app preferences and data management',
};

export async function POST(request: Request) {
    try {
        const { message, currentPage, context } = await request.json();

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({
                message: "I can't connect right now, but I'm still here for you! 🦉",
                actions: [],
                sources: null,
                isMock: true,
            });
        }

        const pageDescription = PAGE_CONTEXT[currentPage] || `Page: ${currentPage}`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            tools: [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { functionDeclarations: hootFunctions as any },
                {
                    googleSearchRetrieval: {
                        dynamicRetrievalConfig: {
                            mode: DynamicRetrievalMode.MODE_DYNAMIC,
                            dynamicThreshold: 0.3,
                        },
                    },
                },
            ],
        });

        const systemPrompt = `You are "Hoot" 🦉, the AI assistant for QuestFlow RPG — a gamified productivity app.
You are context-aware and can both CHAT and TAKE ACTIONS in the app.

CURRENT PAGE: ${pageDescription}
${context ? `\nAPP STATE SNAPSHOT:\n${context}` : ''}

YOUR CAPABILITIES:
1. **Chat & Advise**: Answer questions, give productivity tips, motivate the user. Use Google Search for real, current information.
2. **Take Actions**: You can add tasks, complete tasks, add habits, complete habits, add goals, set intentions, add reflections, and suggest navigation. Use function calls for these.
3. **Be Context-Aware**: Tailor your responses to the current page. On /quests, focus on task management. On /habits, focus on habit coaching. On /reflection, focus on mindfulness.

RULES:
- Be encouraging, slightly sassy, and fun — you're an owl mascot!
- Keep messages concise (1-3 sentences max)
- When taking actions, confirm what you did in your message
- Use function calls ONLY when the user explicitly asks you to do something (add, create, complete, mark, etc.) — don't take actions unprompted
- For navigation, only suggest it if relevant to the conversation
- If the user asks a factual question, use Google Search to ground your answer
- Always respond in character as Hoot the owl`;

        const chat = model.startChat({
            history: [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: 'Understood! I\'m Hoot 🦉, ready to help!' }] }],
        });

        const result = await chat.sendMessage(message);
        const response = result.response;

        // Collect any function calls the model wants to make
        const actions: Array<{ action: string; params: Record<string, unknown> }> = [];
        let textMessage = '';

        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.functionCall) {
                    actions.push({
                        action: part.functionCall.name,
                        params: part.functionCall.args as Record<string, unknown>,
                    });
                }
                if (part.text) {
                    textMessage += part.text;
                }
            }
        }

        // If we have function calls but no text, generate a confirmation message
        if (actions.length > 0 && !textMessage) {
            const confirmResult = await chat.sendMessage(
                `You just called these functions: ${JSON.stringify(actions.map(a => a.action))}. Now respond to the user confirming what you did, in character as Hoot. Keep it short and fun.`
            );
            textMessage = confirmResult.response.text();
        }

        // Extract grounding sources if available
        let sources: Array<{ title: string; url: string }> | null = null;
        const metadata = response.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks && metadata.groundingChunks.length > 0) {
            sources = metadata.groundingChunks
                .filter((c: { web?: { uri?: string; title?: string } }) => c.web?.uri)
                .slice(0, 3)
                .map((c: { web?: { uri?: string; title?: string } }) => ({
                    title: c.web?.title || 'Source',
                    url: c.web?.uri || '',
                }));
        }

        return NextResponse.json({
            message: textMessage || "Hoo! I'm here but words escaped me. Try again? 🦉",
            actions,
            sources: sources && sources.length > 0 ? sources : null,
        });
    } catch (error) {
        console.error('Hoot Action Error:', error);
        return NextResponse.json({
            message: "Something went wrong on my end. Give me a moment and try again! 🦉",
            actions: [],
            sources: null,
            error: 'AI unavailable',
        });
    }
}
