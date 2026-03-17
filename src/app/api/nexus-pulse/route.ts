import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';

export async function POST(request: Request) {
    try {
        const { snapshot, history, pulseContext: clientPulse } = await request.json();
        // history: optional array of past PulseHistoryEntry for trend analysis
        // clientPulse: optional string context from other AI routes

        const mock = hasApiKeyOrMock({
            topInsight: 'Keep pushing — consistency is your superpower.',
            burnoutRisk: 0.2,
            momentum: 'steady',
            suggestion: 'Complete your top 3 habits today to maintain your streak.',
        });
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { responseMimeType: 'application/json' },
        });

        // Build historical context if available
        const historyContext = Array.isArray(history) && history.length > 0
            ? `\n\nHistorical Pulse Data (previous days):\n${history.map((h: { date: string; synthesis: { momentum: string; burnoutRisk: number; topInsight: string } }) =>
                `- ${h.date}: momentum=${h.synthesis.momentum}, burnout=${h.synthesis.burnoutRisk}, insight="${h.synthesis.topInsight}"`
            ).join('\n')}`
            : '';

        const systemPrompt = `You are the Nexus Pulse — the intelligence engine for a productivity RPG called QuestFlow.
You receive a compressed snapshot of the player's data and must produce a concise, actionable synthesis.

Player Snapshot:
${JSON.stringify(snapshot, null, 1)}${historyContext}${clientPulse ? `\n\nAdditional Context:\n${clientPulse}` : ''}

Your task:
1. Analyze cross-domain patterns the player might not see themselves.
2. Detect burnout signals (declining energy + declining completions + dropping streaks).
3. Find correlations (e.g. focus sessions → quest completion, energy → habit consistency).
4. Celebrate genuine progress — don't be falsely positive, but acknowledge real wins.
5. Give ONE concrete, specific suggestion that connects multiple data points.
${historyContext ? '6. Compare with previous days to identify week-over-week trends (improving, plateau, declining).' : ''}

Rules:
- Be concise. Max 1-2 sentences per field.
- Be specific. Reference actual numbers, habit names, or patterns from the data.
- Do NOT be generic ("keep up the good work"). Always tie observations to actual data.
- If data is sparse (new player), acknowledge it and give a helpful onboarding tip.
${historyContext ? '- If historical data is available, note trends vs previous days (e.g., "burnout risk dropped from 0.7 to 0.3 — the lighter load is working").' : ''}

Output ONLY valid JSON with these exact fields:
{
  "topInsight": "One sentence synthesizing the most important cross-domain observation.",
  "burnoutRisk": 0.0 to 1.0 (0 = energized and productive, 1 = severe burnout signals),
  "momentum": "rising" | "steady" | "declining",
  "suggestion": "One concrete, specific action the player should take right now.",
  "celebrationOpportunity": "A genuine win to celebrate, or null if nothing stands out."
}`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        const data = extractJSON(text) as Record<string, unknown>;

        // Validate required fields
        const response = {
            topInsight: typeof data.topInsight === 'string' ? data.topInsight : 'Analysis complete.',
            burnoutRisk: typeof data.burnoutRisk === 'number' ? Math.max(0, Math.min(1, data.burnoutRisk)) : 0.3,
            momentum: ['rising', 'steady', 'declining'].includes(data.momentum as string)
                ? data.momentum as string
                : 'steady',
            suggestion: typeof data.suggestion === 'string' ? data.suggestion : 'Keep making progress!',
            celebrationOpportunity: typeof data.celebrationOpportunity === 'string'
                ? data.celebrationOpportunity
                : null,
        };

        return NextResponse.json(response);
    } catch (error) {
        logger.error('Error', 'nexus-pulse', error);
        return NextResponse.json({
            topInsight: 'Pulse analysis temporarily unavailable.',
            burnoutRisk: 0.3,
            momentum: 'steady',
            suggestion: 'Focus on your most important task today.',
            isMock: true,
        }, { status: 500 });
    }
}
