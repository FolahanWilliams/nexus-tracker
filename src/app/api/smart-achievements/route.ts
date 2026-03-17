import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';

export async function POST(request: Request) {
    try {
        const { recentActivity } = await request.json();

        const mock = hasApiKeyOrMock({ earned: false });
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are the Achievement Engine for QuestFlow RPG.
Analyze the player's recent activity and determine if they've done something noteworthy that deserves a custom achievement.

Recent Activity:
- Tasks completed today: ${recentActivity.completedToday || 0}
- Categories today: ${recentActivity.categoriesToday?.join(', ') || 'None'}
- Current streak: ${recentActivity.streak || 0} days
- Total quests completed: ${recentActivity.totalCompleted || 0}
- Tasks completed this session: ${recentActivity.sessionTasks?.map((t: { title: string }) => t.title).join(', ') || 'None'}

Award achievements for genuinely impressive behavior, NOT for doing the bare minimum. Examples of worthy patterns:
- Completing 5+ tasks in a single day
- Completing tasks across 3+ different categories in one day (well-rounded)
- Maintaining a 7+ day streak
- Completing 3+ Hard/Epic tasks in a row
- A total quest milestone (25, 50, 100 completed)

Output ONLY valid JSON:
- earned: Boolean. True only if the activity is genuinely noteworthy. Be selective — not every session earns one.
- name: String. A creative, RPG-flavored achievement name (e.g., "The Grinder", "Renaissance Soul", "Unstoppable Force"). Only if earned=true.
- description: String. A one-sentence explanation. Only if earned=true.
- icon: String. A single emoji that fits the achievement. Only if earned=true.`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = extractJSON(text) as any;

        return NextResponse.json(data);
    } catch (error) {
        logger.error('Smart Achievement Error', 'smart-achievements', error);
        return NextResponse.json({ earned: false, error: 'AI unavailable' });
    }
}
