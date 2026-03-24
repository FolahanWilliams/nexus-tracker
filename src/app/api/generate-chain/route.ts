import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput, clampNumber } from '@/lib/sanitize';
import { generateAndExtractJSON, validateDifficulty } from '@/lib/ai-route-helpers';

export const POST = withAuth(async (request) => {
    try {
        const { prompt: rawPrompt } = await request.json();

        const prompt = sanitizePromptInput(rawPrompt, 1000);
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const mock = hasApiKeyOrMock({
            name: `[MOCK] Campaign: ${prompt}`,
            description: `A generated campaign for ${prompt}`,
            difficulty: 'Medium',
            steps: [
                {
                    title: 'Step 1: Preparation',
                    description: 'Get everything ready before diving in.',
                    branches: [
                        { label: 'Plan Thoroughly', description: 'Create a detailed outline and gather all resources first.', xpBonus: 30 },
                        { label: 'Start Lean', description: 'Begin with the minimum setup and adapt as you go.', xpBonus: 20 },
                    ]
                },
                { title: 'Step 2: Execution', description: 'Do the hard work and push through challenges.' },
                { title: 'Step 3: Review', description: 'Reflect on what was accomplished and refine your approach.' },
            ],
            reward: { xp: 200, gold: 100 },
        });
        if (mock) return mock;

        const systemPrompt = `You are a Gamified Productivity AI for QuestFlow RPG.
Break down the user's large project into a "Quest Chain" of 3-6 logical steps with optional branching paths.

You have access to Google Search. Use it to research the user's project topic for current best practices, tools, and resources.

Output ONLY a valid JSON object with:
- name: RPG-styled quest chain name
- description: Short motivating description
- difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic'
- steps: Array of 3-6 objects with { title, description, branches? }
  - branches (optional, 1-2 steps): Array of 2 { label, description, xpBonus (10-50) }
- reward: { xp: number (50-500), gold: number (25-250) }`;

        const data = await generateAndExtractJSON(`${systemPrompt}\n\nUser Goal: ${prompt}`);

        data.difficulty = validateDifficulty(data.difficulty);
        const reward = data.reward as { xp?: number; gold?: number } | undefined;
        data.reward = {
            xp: clampNumber(reward?.xp, 10, 500, 100),
            gold: clampNumber(reward?.gold, 5, 250, 50),
        };

        return NextResponse.json(data);
    } catch (error) {
        logger.error('Gemini Generate Chain Error', 'generate-chain', error);
        return NextResponse.json({
            name: `Project`,
            description: 'Failed to generate AI steps.',
            difficulty: 'Medium',
            steps: [
                { title: 'Step 1', description: 'Start the task' }
            ],
            reward: { xp: 50, gold: 25 },
            error: 'AI unavailable'
        }, { status: 500 });
    }
}, { rateLimitMax: 20 });
