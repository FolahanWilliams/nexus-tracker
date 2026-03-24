import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput, clampNumber } from '@/lib/sanitize';
import { generateAndExtractJSON, validateDifficulty, validateCategory } from '@/lib/ai-route-helpers';

export const POST = withAuth(async (request) => {
    try {
        const { goal: rawGoal, context } = await request.json();

        const goal = sanitizePromptInput(rawGoal, 1000);
        if (!goal) {
            return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
        }

        const mock = hasApiKeyOrMock({
            parentTask: { title: goal, difficulty: 'Hard', category: 'Work', xpReward: 50 },
            subtasks: [
                { title: `Research: ${goal}`, difficulty: 'Easy', category: 'Work', xpReward: 10, order: 1, estimatedMinutes: 30 },
                { title: `Plan approach for ${goal}`, difficulty: 'Medium', category: 'Work', xpReward: 25, order: 2, estimatedMinutes: 45 },
                { title: `Execute: ${goal}`, difficulty: 'Hard', category: 'Work', xpReward: 50, order: 3, estimatedMinutes: 120 },
                { title: `Review and refine`, difficulty: 'Easy', category: 'Work', xpReward: 15, order: 4, estimatedMinutes: 20 },
            ],
            strategy: 'Start with research to understand the scope, then plan your approach before diving into execution.',
            estimatedTotalMinutes: 215,
        });
        if (mock) return mock;

        const playerSection = context ? `
Player Context:
- Level: ${context.level || 1}
- Class: ${context.characterClass || 'Novice'}
- Preferred difficulty: ${context.preferredDifficulty || 'Medium'}
- Avg daily tasks: ${context.avgDailyTasks || 'unknown'}
- Peak time: ${context.peakProductivityTime || 'unknown'}
Calibrate sub-task difficulty and count to match this player's capacity.` : '';

        const systemPrompt = `You are the Task Breakdown Engine for QuestFlow RPG.
Decompose a vague or complex goal into specific, actionable sub-tasks.

You have access to Google Search. Use it to research the goal topic for current best practices and tools.
${playerSection}

Rules:
- Break the goal into 3-7 concrete sub-tasks (single clear actions, not vague goals)
- Order logically (dependencies first), assign realistic difficulty and time estimates
- Include a brief strategy sentence
- If the goal is already simple, return 1-2 sub-tasks

Output ONLY valid JSON:
{
  "parentTask": { "title": string, "difficulty": "Easy|Medium|Hard|Epic", "category": "Study|Health|Creative|Work|Social|Personal|Other", "xpReward": number },
  "subtasks": [{ "title": string, "difficulty": string, "category": string, "xpReward": number, "order": number, "estimatedMinutes": number }],
  "strategy": string,
  "estimatedTotalMinutes": number
}`;

        const data = await generateAndExtractJSON(`${systemPrompt}\n\nGoal to break down: "${goal}"`, true);

        if (data.parentTask && typeof data.parentTask === 'object') {
            const parent = data.parentTask as Record<string, unknown>;
            parent.difficulty = validateDifficulty(parent.difficulty);
            parent.category = validateCategory(parent.category);
            parent.xpReward = clampNumber(parent.xpReward, 5, 200, 50);
        }

        if (Array.isArray(data.subtasks)) {
            for (const sub of data.subtasks as Record<string, unknown>[]) {
                sub.difficulty = validateDifficulty(sub.difficulty);
                sub.category = validateCategory(sub.category);
                sub.xpReward = clampNumber(sub.xpReward, 5, 100, 25);
                sub.estimatedMinutes = clampNumber(sub.estimatedMinutes, 5, 480, 30);
            }
        }

        data.estimatedTotalMinutes = clampNumber(data.estimatedTotalMinutes, 10, 2400, 120);
        if (typeof data.strategy !== 'string') data.strategy = '';

        return NextResponse.json(data);
    } catch (error) {
        logger.error('Task Breakdown Error', 'task-breakdown', error);
        return NextResponse.json({
            parentTask: { title: 'Plan your approach', difficulty: 'Medium', category: 'Other', xpReward: 25 },
            subtasks: [],
            strategy: 'Could not break down the goal. Try rephrasing it.',
            estimatedTotalMinutes: 0,
            error: 'AI unavailable',
        }, { status: 500 });
    }
}, { rateLimitMax: 20 });
