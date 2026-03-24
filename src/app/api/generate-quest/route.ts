import { NextResponse } from 'next/server';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput, clampNumber } from '@/lib/sanitize';
import { generateAndExtractJSON, validateDifficulty } from '@/lib/ai-route-helpers';

export const POST = withAuth(async (request) => {
    try {
        const { prompt: rawPrompt, context } = await request.json();
        const prompt = sanitizePromptInput(rawPrompt, 1000);

        const mock = hasApiKeyOrMock({
            quests: [
                { title: `[MOCK] Research: ${prompt}`, xp: 20, difficulty: 'Easy' },
                { title: `[MOCK] Plan: ${prompt}`, xp: 50, difficulty: 'Medium' },
                { title: `[MOCK] Execute: ${prompt}`, xp: 100, difficulty: 'Hard' }
            ],
        });
        if (mock) return mock;

        const playerContext = context ? `
Player Profile:
- Name: ${context.name || 'Unknown'}
- Class: ${context.characterClass || 'None'}
- Level: ${context.level || 1}
- Total Quests Completed: ${context.totalQuestsCompleted || 0}
- Current Streak: ${context.streak || 0} days
Tailor the quests to suit a ${context.characterClass || 'general'} player at level ${context.level || 1}.` : '';

        const pulseSection = context?.pulseData ? `
Nexus Pulse Intelligence:
- Momentum: ${context.pulseData.momentum || 'unknown'}
- Burnout Risk: ${context.pulseData.burnoutRisk ?? 'unknown'}
- AI Insight: ${context.pulseData.topInsight || 'N/A'}
- Suggestion: ${context.pulseData.suggestion || 'N/A'}
Use this to calibrate quest difficulty. If burnout risk is high (>0.6), lean toward Easy/Medium quests. If momentum is rising, feel free to suggest Hard/Epic challenges.` : '';

        const systemPrompt = `You are a Gamified Productivity AI for QuestFlow RPG. Break down the user's goal into 1-2 executable "quests" (tasks).

You have access to Google Search. Use it to research the user's goal topic for current, accurate information and make quests reference real tools, resources, or techniques.

For each quest, output a JSON object with:
- title: Actionable, specific task name (written like a real RPG quest objective)
- xp: Experience points (10=Easy, 25=Medium, 50=Hard, 100=Epic)
- difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic'

Scale difficulty based on effort required. Focus on quality over quantity - generate only the most essential tasks.
${playerContext}${pulseSection}
Output ONLY a valid JSON object with a "quests" array. No other text.`;

        const data = await generateAndExtractJSON(`${systemPrompt}\n\nUser Goal: ${prompt}`);

        if (Array.isArray(data.quests)) {
            for (const q of data.quests as Record<string, unknown>[]) {
                q.xp = clampNumber(q.xp, 5, 200, 25);
                q.difficulty = validateDifficulty(q.difficulty);
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        logger.error('Gemini Generation Error', 'generate-quest', error);
        return NextResponse.json({
            quests: [
                { title: 'Plan your approach', xp: 10, difficulty: 'Easy' },
                { title: 'Execute the main task', xp: 50, difficulty: 'Hard' },
                { title: 'Review and reflect', xp: 25, difficulty: 'Medium' }
            ],
            isMock: true,
            error: 'AI unavailable — using fallback quests'
        });
    }
}, { rateLimitMax: 20 });
