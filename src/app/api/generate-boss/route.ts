import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { clampNumber } from '@/lib/sanitize';
import { generateAndExtractJSON, validateDifficulty } from '@/lib/ai-route-helpers';

export const POST = withAuth(async (request) => {
    try {
        const { uncompletedTasks, failedHabits, playerContext, pulseData } = await request.json();

        const mock = hasApiKeyOrMock({
            name: "The Generic Procrastinator",
            description: "A shadowy figure forged from the tasks you put off until tomorrow.",
            difficulty: "Medium",
            hp: 500,
            maxHp: 500,
            xpReward: 150,
            goldReward: 75,
        });
        if (mock) return mock;

        const systemPrompt = `You are the Dungeon Master for QuestFlow RPG.
Generate a Custom Boss Battle based on the player's recent struggles.

You have access to Google Search. Use it to reference current events, trending topics, or real-world challenges to make the boss feel timely and relevant.

Context:
- Player Level: ${playerContext?.level || 1}
- Uncompleted Tasks: ${uncompletedTasks?.map((t: { title: string }) => t.title).join(', ') || 'None'}
- Failed/Ignored Habits: ${failedHabits?.map((h: { name: string }) => h.name).join(', ') || 'None'}

${pulseData ? `
Nexus Pulse Intelligence:
- Momentum: ${pulseData.momentum || 'unknown'}
- Burnout Risk: ${pulseData.burnoutRisk ?? 'unknown'}
- Current Pattern: ${pulseData.topInsight || 'N/A'}
If burnout risk is high, make the boss more manageable (lower HP). If momentum is rising, make it an epic challenge.` : ''}

Create a boss themed around these struggles. Scale HP to Player Level (Level ${playerContext?.level || 1}):
- Level 1-5: 200-500 HP
- Level 6-15: 500-1500 HP
- Level 16+: 1500+ HP

Output ONLY a valid JSON object with:
- name: string, description: string, difficulty: 'Easy'|'Medium'|'Hard'|'Epic'
- hp: number, xpReward: number (100-500), goldReward: number (50-200)`;

        const data = await generateAndExtractJSON(systemPrompt);

        data.hp = clampNumber(data.hp, 100, 5000, 500);
        data.xpReward = clampNumber(data.xpReward, 50, 500, 150);
        data.goldReward = clampNumber(data.goldReward, 25, 250, 75);
        data.difficulty = validateDifficulty(data.difficulty);

        return NextResponse.json({
            ...data,
            maxHp: data.hp,
            startsAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            completed: false,
            failed: false
        });
    } catch (error) {
        logger.error('Gemini Boss Gen Error', 'generate-boss', error);
        return NextResponse.json({
            name: "The Chaos Anomaly",
            description: "A glitch in the matrix blocking your path.",
            difficulty: "Hard",
            hp: 800,
            maxHp: 800,
            xpReward: 200,
            goldReward: 100,
            startsAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            completed: false,
            failed: false,
            isMock: true,
            error: 'AI unavailable'
        });
    }
}, { rateLimitMax: 20 });
