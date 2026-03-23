import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/with-auth';

/**
 * POST: Compute connections between daily growth nodes based on shared topics,
 * habits, skills, and vocabulary reinforcement.
 */
export const POST = withAuth(async (request) => {
    try {
        const { dailyNodes } = await request.json() as {
            dailyNodes: {
                id: string;
                logDate: string;
                conceptsLearned: string[];
                habitsCompleted: string[];
                questsCompleted: number;
                wordsReviewed: number;
                focusMinutes: number;
                logSummary: string;
            }[];
        };

        if (!dailyNodes?.length) {
            return NextResponse.json({ edges: [] });
        }

        const edges: { source: string; target: string; type: string; weight: number }[] = [];

        // Compute edges between all pairs
        for (let i = 0; i < dailyNodes.length; i++) {
            for (let j = i + 1; j < dailyNodes.length; j++) {
                const a = dailyNodes[i];
                const b = dailyNodes[j];

                // Continued topics: shared concepts
                const sharedConcepts = a.conceptsLearned.filter(
                    (c) => b.conceptsLearned.includes(c)
                );
                if (sharedConcepts.length > 0) {
                    edges.push({
                        source: a.id,
                        target: b.id,
                        type: 'topic_continuity',
                        weight: Math.min(sharedConcepts.length / 3, 1),
                    });
                }

                // Habit continuity: sequential days with same habits
                const dayDiff = Math.abs(
                    (new Date(a.logDate).getTime() - new Date(b.logDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                if (dayDiff === 1) {
                    const sharedHabits = a.habitsCompleted.filter(
                        (h) => b.habitsCompleted.includes(h)
                    );
                    if (sharedHabits.length > 0) {
                        edges.push({
                            source: a.id,
                            target: b.id,
                            type: 'habit_continuity',
                            weight: Math.min(sharedHabits.length / 5, 0.6),
                        });
                    }
                }

                // Skill progression: both days have quests completed and shared concepts
                if (a.questsCompleted > 0 && b.questsCompleted > 0 && sharedConcepts.length > 0) {
                    edges.push({
                        source: a.id,
                        target: b.id,
                        type: 'skill_progression',
                        weight: Math.min((sharedConcepts.length * 0.3), 0.8),
                    });
                }
            }
        }

        return NextResponse.json({ edges });
    } catch (error) {
        logger.error('Growth web computation failed', 'growth-web', error);
        return NextResponse.json({ edges: [], error: 'Computation failed' }, { status: 500 });
    }
});
