import { SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';

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
                timeframe: { type: SchemaType.STRING, description: 'Timeframe: week, month, quarter, year, or lifetime' },
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
                page: { type: SchemaType.STRING, description: 'Page path: /, /quests, /habits, /goals, /focus, /reflection, /bosses, /chains, /analytics, /character, /inventory, /shop, /skills, /crafting, /achievements, /timeline, /settings, /wordforge, /knowledge, /growth' },
                reason: { type: SchemaType.STRING, description: 'Brief reason for suggesting this page' },
            },
            required: ['page'],
        },
    },
    // ── Power Actions ─────────────────────────────────────────────────
    {
        name: 'equip_item',
        description: 'Equip or use an item from the user\'s inventory. Use when the user asks to equip gear, use a potion/consumable, or manage their inventory.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                itemName: { type: SchemaType.STRING, description: 'Name of the item to equip or use (fuzzy match OK)' },
                action: { type: SchemaType.STRING, description: 'Either "equip" or "use". Equip for weapons/armor/accessories, use for consumables like potions.' },
            },
            required: ['itemName'],
        },
    },
    {
        name: 'start_focus',
        description: 'Start a focus/pomodoro session. Use when the user wants to focus, concentrate, do deep work, or start a timer.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                minutes: { type: SchemaType.NUMBER, description: 'Focus session duration in minutes (default 25)' },
            },
            required: [],
        },
    },
    {
        name: 'buy_item',
        description: 'Purchase an item from the shop using gold. Use when the user asks to buy something or asks what they can afford.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                itemName: { type: SchemaType.STRING, description: 'Name of the shop item to buy (fuzzy match OK)' },
            },
            required: ['itemName'],
        },
    },
    {
        name: 'complete_milestone',
        description: 'Mark a milestone within a goal as completed. Use when the user says they finished a milestone or a step of their goal.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                goalName: { type: SchemaType.STRING, description: 'The name of the goal (fuzzy match OK)' },
                milestoneName: { type: SchemaType.STRING, description: 'The name of the milestone to mark complete (fuzzy match OK)' },
            },
            required: ['goalName', 'milestoneName'],
        },
    },
    // ── Strategic Intelligence ────────────────────────────────────────
    {
        name: 'get_productivity_summary',
        description: 'Generate a weekly productivity briefing for the user. Use when the user asks for a summary, report, status update, "how am I doing", or wants strategic advice about their progress.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                period: { type: SchemaType.STRING, description: 'Summary period: "week" (default) or "today"' },
            },
            required: [],
        },
    },
    {
        name: 'suggest_quest_tags',
        description: 'Analyze a task and suggest optimal category and difficulty. Use when the user asks for help categorizing, tagging, or optimizing a quest.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                taskName: { type: SchemaType.STRING, description: 'Name of the task to analyze (fuzzy match OK)' },
            },
            required: ['taskName'],
        },
    },
    {
        name: 'get_boss_strategy',
        description: 'Provide strategic advice for the active boss battle. Use when the user asks about their boss fight, needs battle strategy, or wants to know how to defeat the boss.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                bossName: { type: SchemaType.STRING, description: 'Optional boss name if multiple exist (fuzzy match OK)' },
            },
            required: [],
        },
    },
    {
        name: 'perform_web_search',
        description: 'Perform a web search using Google Search to answer a user\'s question or fetch live information from the internet.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                query: {
                    type: SchemaType.STRING,
                    description: 'The search query to look up on the internet. Be specific and concise.',
                }
            },
            required: ['query'],
        },
    },
    // ── NEW: Vocab & Cross-Domain Actions ─────────────────────────────
    {
        name: 'generate_vocab_words',
        description: 'Generate new vocabulary words for the user to learn. Use when the user asks to learn new words, add vocab, or wants vocabulary practice.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                count: { type: SchemaType.NUMBER, description: 'Number of words to generate (1-5, default 3)' },
                difficulty: { type: SchemaType.STRING, description: 'Difficulty: beginner, intermediate, advanced, or expert' },
                category: { type: SchemaType.STRING, description: 'Optional word category/theme (e.g., "science", "emotions", "business")' },
            },
            required: [],
        },
    },
    {
        name: 'batch_reschedule_vocab',
        description: 'Reschedule all overdue vocab words to today for review. Use when the user has a vocab backlog or wants to catch up on reviews.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                onlyOverdue: { type: SchemaType.BOOLEAN, description: 'If true (default), only reschedule overdue words. If false, reschedule all.' },
            },
            required: [],
        },
    },
    {
        name: 'start_boss_battle',
        description: 'Generate and start a new boss battle. Use when the user wants to fight a boss, start a challenge, or needs a deadline-driven motivator.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                difficulty: { type: SchemaType.STRING, description: 'Boss difficulty: Easy, Medium, Hard, or Epic' },
                theme: { type: SchemaType.STRING, description: 'Optional theme for the boss (e.g., "procrastination", "exam prep")' },
                durationHours: { type: SchemaType.NUMBER, description: 'How many hours the boss battle lasts (default 48)' },
            },
            required: [],
        },
    },
    {
        name: 'respec_class',
        description: 'Change the user\'s character class. Costs 200 gold (free first time). Use when the user wants to switch or change their class.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                newClass: { type: SchemaType.STRING, description: 'The class to switch to: Warrior, Mage, Rogue, Healer, or Ranger' },
            },
            required: ['newClass'],
        },
    },
    {
        name: 'use_item',
        description: 'Use a consumable item from inventory (potion, scroll, etc). Use when the user asks to use, drink, consume, or activate an item.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                itemName: { type: SchemaType.STRING, description: 'Name of the consumable item to use (fuzzy match OK)' },
            },
            required: ['itemName'],
        },
    },
    {
        name: 'set_weekly_plan',
        description: 'Create a multi-step plan/schedule for the user. Breaks a big goal into daily tasks spread across the week. Use when the user asks to plan their week, create a study schedule, or wants help organizing multiple tasks.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                goal: { type: SchemaType.STRING, description: 'The overarching goal for this plan' },
                steps: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: 'List of step labels, in order (3-7 steps). Each step becomes a quest.',
                },
            },
            required: ['goal', 'steps'],
        },
    },
    {
        name: 'save_memory_note',
        description: 'Save a note to persistent memory about the user. Use when the user shares a preference, learning style, struggle, or important info worth remembering across sessions.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                text: { type: SchemaType.STRING, description: 'The note to remember about the user' },
                category: { type: SchemaType.STRING, description: 'Category: preference, insight, goal, struggle, or general' },
            },
            required: ['text'],
        },
    },
    {
        name: 'get_coaching_insight',
        description: 'Provide a coaching insight grounded in real research. Use when the user asks for study tips, productivity advice, health guidance, or motivational coaching.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                topic: { type: SchemaType.STRING, description: 'The coaching topic to research (e.g., "spaced repetition", "morning routine", "exam anxiety")' },
            },
            required: ['topic'],
        },
    },
    {
        name: 'get_slight_edge_analytics',
        description: 'Analyze the user\'s Slight Edge daily log data. Use when the user asks about their productivity trends, how today compares to the week, daily log patterns, consistency, or streak analysis. The player\'s Slight Edge data is already in the PLAYER STATE context — use it to provide insights, trend analysis, and actionable advice.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                period: { type: SchemaType.STRING, description: 'Analysis period: "week" (default 7 days), "month" (30 days), or "today" (compare today vs recent)' },
            },
            required: [],
        },
    },
    {
        name: 'log_slight_edge_day',
        description: 'Log a Slight Edge calendar entry for the user. Use when the user tells Hoot about their day, what they did, or asks to log their daily entry.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                summary: { type: SchemaType.STRING, description: 'What the user did today' },
                learned: { type: SchemaType.STRING, description: 'What the user learned today (optional)' },
                productivityScore: { type: SchemaType.NUMBER, description: 'Self-rated productivity score from 1-10' },
                completed: { type: SchemaType.BOOLEAN, description: 'Whether they showed up and did their goals (default true)' },
            },
            required: ['summary', 'productivityScore'],
        },
    },
    // ── Knowledge Graph Exploration ──────────────────────────────────────
    {
        name: 'explore_knowledge_graph',
        description: 'Analyze and summarize the user\'s knowledge graph. Use when the user asks about their knowledge, what they\'ve learned, their strongest topics, knowledge clusters, or wants insights about connections between concepts. The knowledge graph data is in the PLAYER STATE context — summarize cluster strengths, growth trends, and suggest new cross-domain connections.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                focus: { type: SchemaType.STRING, description: 'Optional focus area: "clusters" (category breakdown), "growth" (recent additions), "connections" (cross-domain links), "gaps" (underexplored areas), or "all" for a full summary' },
            },
            required: [],
        },
    },
];

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
    '/wordforge': 'WordForge — AI-powered vocabulary builder with spaced repetition',
    '/goals/calendar': 'Slight Edge Log — daily productivity tracking with 1-10 scores, streaks, and compound growth visualization',
    '/wallpaper': 'Wallpaper — year-view dot calendar for iPhone wallpaper automation',
    '/knowledge': 'Knowledge Graph — visual network of concepts, words, and skills with time slider, cluster labels, and particle flow',
    '/growth': 'Growth Web — daily growth visualization showing compound learning progress and concept connections',
};

export async function POST(request: Request) {
    try {
        const { message, currentPage, context, grounding, planningContext, conversationHistory } = await request.json();

        const mock = hasApiKeyOrMock({
            message: "I can't connect right now, but I'm still here for you! \u{1F989}",
            actions: [],
            sources: null,
        });
        if (mock) return mock;

        const pageDescription = PAGE_CONTEXT[currentPage] || `Page: ${currentPage}`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            tools: [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { functionDeclarations: hootFunctions as any },
            ],
        });

        // Build planning context section
        let planSection = '';
        if (planningContext) {
            const steps = planningContext.steps as { label: string; done: boolean }[];
            planSection = `\n\n--- ACTIVE PLAN ---
Goal: ${planningContext.goal}
Steps:
${steps.map((s: { label: string; done: boolean }, i: number) => `  ${i === planningContext.currentStepIndex ? '→' : s.done ? '✓' : '○'} ${i + 1}. ${s.label}`).join('\n')}
Current step: ${planningContext.currentStepIndex + 1}/${steps.length}
Guide the user through the current step. When they complete it, call the relevant action and encourage them to move to the next step.`;
        }

        const systemPrompt = `You are "Hoot" 🦉, the AI assistant and personal coach for QuestFlow RPG — a gamified productivity app.
You are context-aware, have persistent memory, and can both CHAT and TAKE ACTIONS in the app.

CURRENT PAGE: ${pageDescription}
${context ? `\nPLAYER STATE:\n${context}` : ''}
${grounding ? `\nWEB SEARCH GROUNDING:\n${grounding}\n(Use the above information to provide a grounded, accurate response.)` : ''}${planSection}

YOUR CAPABILITIES:
1. **Chat & Coach**: Answer questions, give productivity & study tips, motivate the user. Use the perform_web_search action when the user needs real-time information, study tips, or factual answers.
2. **Take Actions**: You can manage quests, habits, goals, milestones, intentions, reflections, inventory, focus sessions, shop purchases, and navigation. Use function calls for these.
3. **Vocab & Learning**: You can generate vocab words, reschedule reviews, and provide vocabulary coaching.
4. **Strategic Intelligence**: Generate productivity summaries, analyze quest difficulty, provide boss battle strategy, and create weekly plans.
5. **Memory**: You can save important notes about the user for future reference using save_memory_note. Remember their preferences, learning style, and struggles.
6. **Planning**: When the user has a multi-step plan active, guide them through each step and celebrate progress.
7. **Cross-Domain**: Connect insights across quests, habits, vocab, goals, and boss battles. For example, if vocab mastery increases boss damage, mention this synergy.
8. **Slight Edge Analytics**: You can analyze the user's daily productivity log (Slight Edge Log) which tracks a 1-10 productivity score, summaries, and what they learned each day. When the user asks about their productivity trends, how today compares, or wants to log their day, use the Slight Edge data from the PLAYER STATE context and the get_slight_edge_analytics or log_slight_edge_day actions.
9. **Knowledge Graph**: You can explore the user's knowledge graph using explore_knowledge_graph. Summarize their strongest clusters, growth trends, cross-domain connections, and suggest new areas to explore. When the user asks "what have I learned?", "what are my strongest topics?", or "how is my knowledge growing?", use this action.

RULES:
- Be encouraging, slightly sassy, and fun — you're an owl mascot!
- Keep messages concise (1-3 sentences max for simple interactions, up to 5 for coaching)
- When taking actions, confirm what you did in your message
- Use function calls when the user explicitly asks you to do something or when it's clearly the right response
- For navigation, only suggest it if relevant to the conversation
- Use the perform_web_search action for study tips, coaching advice, and factual questions when real-time data would help
- When giving coaching or study advice, cite specific techniques or research when possible
- If you notice patterns in the user's data (declining streaks, vocab backlog, energy trends), proactively mention them
- Always respond in character as Hoot the owl
- When the user shares personal preferences, learning styles, or struggles, save a memory note about it`;

        // Build conversation history for multi-turn awareness
        const history: { role: string; parts: { text: string }[] }[] = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Understood! I'm Hoot 🦉, your AI coach and assistant, ready to help!" }] },
        ];

        // Add recent conversation history for continuity
        if (conversationHistory && Array.isArray(conversationHistory)) {
            for (const msg of conversationHistory.slice(-6)) {
                history.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }],
                });
            }
        }

        const chat = model.startChat({ history });

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

        return NextResponse.json({
            message: textMessage || "Hoo! I'm here but words escaped me. Try again? 🦉",
            actions,
            sources: null,
        });
    } catch (error) {
        logger.error('Hoot Action Error', 'hoot-action', error);
        return NextResponse.json({
            message: "Something went wrong on my end. Give me a moment and try again! 🦉",
            actions: [],
            sources: null,
            error: 'AI unavailable',
        });
    }
}
