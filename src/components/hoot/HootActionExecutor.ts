import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { HootAction } from '@/store/useHootStore';
import { logger } from '@/lib/logger';
import type { CharacterClass } from '@/store/types';

type GameState = ReturnType<typeof useGameStore.getState>;

/**
 * Execute an array of HootActions against the game store.
 * Returns a list of human-readable result strings.
 */
export async function executeHootActions(
    actions: HootAction[],
    deps: {
        router: { push: (path: string) => void };
        addToast: ReturnType<typeof useToastStore.getState>['addToast'];
        setPlanningContext: (ctx: null | { goal: string; steps: { label: string; done: boolean }[]; currentStepIndex: number }) => void;
    },
): Promise<string[]> {
    const results: string[] = [];
    const state = useGameStore.getState();
    const { router, addToast } = deps;

    for (const { action, params } of actions) {
        try {
            switch (action) {
                case 'add_task': {
                    const title = params.title as string;
                    const difficulty = (params.difficulty as 'Easy' | 'Medium' | 'Hard' | 'Epic') || 'Medium';
                    const category = (params.category as string) || 'Other';
                    state.addTask(title, difficulty, undefined, category as 'Study' | 'Health' | 'Creative' | 'Social' | 'Work' | 'Personal' | 'Other');
                    results.push(`✅ Added quest: "${title}" (${difficulty})`);
                    addToast(`🦉 Hoot added quest: ${title}`, 'success');
                    break;
                }
                case 'complete_task': {
                    const taskName = (params.taskName as string | undefined)?.toLowerCase();
                    if (!taskName) { results.push(`⚠️ No task name provided`); break; }
                    const task = state.tasks.find(t =>
                        !t.completed && t.title.toLowerCase().includes(taskName)
                    );
                    if (task) {
                        state.toggleTask(task.id);
                        results.push(`✅ Completed quest: "${task.title}"`);
                        addToast(`🦉 Hoot completed: ${task.title}`, 'success');
                    } else {
                        results.push(`⚠️ Couldn't find a matching active quest for "${params.taskName}"`);
                    }
                    break;
                }
                case 'add_habit': {
                    const name = params.name as string;
                    const icon = (params.icon as string) || '⭐';
                    const cat = (params.category as string) || 'Personal';
                    const xp = (params.xpReward as number) || 15;
                    state.addHabit(name, icon, cat as 'Study' | 'Health' | 'Creative' | 'Social' | 'Work' | 'Personal' | 'Other', xp);
                    results.push(`✅ Created habit: ${icon} ${name}`);
                    addToast(`🦉 Hoot created habit: ${name}`, 'success');
                    break;
                }
                case 'complete_habit': {
                    const habitName = (params.habitName as string | undefined)?.toLowerCase();
                    if (!habitName) { results.push(`⚠️ No habit name provided`); break; }
                    const today = new Date().toISOString().split('T')[0];
                    const habit = state.habits.find(h =>
                        h.name.toLowerCase().includes(habitName) && !h.completedDates.includes(today)
                    );
                    if (habit) {
                        state.completeHabit(habit.id);
                        results.push(`✅ Completed habit: "${habit.name}"`);
                        addToast(`🦉 Hoot checked off: ${habit.name}`, 'success');
                    } else {
                        results.push(`⚠️ Couldn't find an uncompleted habit matching "${params.habitName}"`);
                    }
                    break;
                }
                case 'add_goal': {
                    const title = params.title as string;
                    const desc = (params.description as string) || '';
                    const cat = (params.category as string) || 'Personal';
                    const tf = (params.timeframe as string) || 'month';
                    const td = (params.targetDate as string) || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
                    const ms = (params.milestones as string[]) || ['Get started', 'Make progress', 'Complete'];
                    const xp = (params.xpReward as number) || 200;
                    state.addGoal(title, desc, cat as 'Study' | 'Health' | 'Creative' | 'Social' | 'Work' | 'Personal' | 'Other', tf as 'week' | 'month' | 'quarter' | 'year' | 'lifetime', td, ms, xp);
                    results.push(`✅ Created goal: "${title}" with ${ms.length} milestones`);
                    addToast(`🦉 Hoot created goal: ${title}`, 'success');
                    break;
                }
                case 'set_daily_intention': {
                    const intention = params.intention as string;
                    const energy = (params.energyRating as number) || 3;
                    state.setDailyIntention(intention, energy);
                    results.push(`✅ Set intention: "${intention}" (Energy: ${energy}/5)`);
                    break;
                }
                case 'add_reflection': {
                    const note = params.note as string;
                    const stars = (params.stars as number) || 3;
                    state.addReflectionNote(note, stars, 10);
                    results.push(`✅ Added reflection (${stars}★) +10 XP`);
                    break;
                }
                case 'navigate': {
                    const page = params.page as string;
                    const reason = params.reason as string;
                    router.push(page);
                    results.push(`🧭 Navigating to ${page}${reason ? ` — ${reason}` : ''}`);
                    break;
                }
                case 'equip_item': {
                    const itemName = (params.itemName as string | undefined)?.toLowerCase();
                    if (!itemName) { results.push(`⚠️ No item name provided`); break; }
                    const act = (params.action as string) || 'equip';
                    const item = state.inventory.find(i => i.name.toLowerCase().includes(itemName));
                    if (!item) {
                        results.push(`⚠️ Couldn't find "${params.itemName}" in your inventory`);
                    } else if (act === 'use' && (item.usable || item.consumableEffect)) {
                        state.useItem(item.id);
                        results.push(`✅ Used ${item.name}${item.consumableEffect ? ` (${item.consumableEffect.type} +${item.consumableEffect.value})` : ''}`);
                        addToast(`🦉 Used ${item.name}`, 'success');
                    } else {
                        state.equipItem(item.id);
                        results.push(`✅ Equipped ${item.name}`);
                        addToast(`🦉 Equipped ${item.name}`, 'success');
                    }
                    break;
                }
                case 'start_focus': {
                    const minutes = (params.minutes as number) || 25;
                    state.addFocusSession(minutes);
                    router.push('/focus');
                    results.push(`✅ Logged ${minutes}-min focus session & navigating to Focus Timer`);
                    addToast(`🦉 Focus session logged: ${minutes} min`, 'success');
                    break;
                }
                case 'buy_item': {
                    const itemName = (params.itemName as string | undefined)?.toLowerCase();
                    if (!itemName) { results.push(`⚠️ No item name provided`); break; }
                    const shopItem = state.shopItems.find(r => !r.purchased && r.name.toLowerCase().includes(itemName));
                    if (!shopItem) {
                        results.push(`⚠️ Couldn't find "${params.itemName}" in the shop`);
                    } else if (shopItem.cost > state.gold) {
                        results.push(`⚠️ Not enough gold! ${shopItem.name} costs ${shopItem.cost}g, you have ${state.gold}g`);
                    } else {
                        state.buyReward(shopItem.id);
                        results.push(`✅ Purchased ${shopItem.name} for ${shopItem.cost}g (Remaining: ${state.gold - shopItem.cost}g)`);
                        addToast(`🦉 Bought ${shopItem.name}!`, 'success');
                    }
                    break;
                }
                case 'complete_milestone': {
                    const goalName = (params.goalName as string | undefined)?.toLowerCase();
                    const msName = (params.milestoneName as string | undefined)?.toLowerCase();
                    if (!goalName || !msName) { results.push(`⚠️ Missing goal or milestone name`); break; }
                    const goal = state.goals.find(g => !g.completed && g.title.toLowerCase().includes(goalName));
                    if (!goal) {
                        results.push(`⚠️ Couldn't find an active goal matching "${params.goalName}"`);
                    } else {
                        const milestone = goal.milestones.find(m => !m.completed && m.title.toLowerCase().includes(msName));
                        if (!milestone) {
                            results.push(`⚠️ Couldn't find an uncompleted milestone matching "${params.milestoneName}" in goal "${goal.title}"`);
                        } else {
                            state.completeGoalMilestone(goal.id, milestone.id);
                            const done = goal.milestones.filter(m => m.completed).length + 1;
                            results.push(`✅ Completed milestone "${milestone.title}" on goal "${goal.title}" (${done}/${goal.milestones.length})`);
                            addToast(`🦉 Milestone done: ${milestone.title}`, 'success');
                        }
                    }
                    break;
                }
                case 'get_productivity_summary': {
                    const summary = buildProductivitySummary(state);
                    results.push(summary);
                    break;
                }
                case 'suggest_quest_tags': {
                    const taskName = (params.taskName as string | undefined)?.toLowerCase();
                    if (!taskName) { results.push(`⚠️ No task name provided`); break; }
                    const task = state.tasks.find(t => t.title.toLowerCase().includes(taskName));
                    if (!task) {
                        results.push(`⚠️ Couldn't find a quest matching "${params.taskName}"`);
                    } else {
                        results.push(`📋 Quest "${task.title}": Category=${task.category}, Difficulty=${task.difficulty}, XP=${task.xpReward}`);
                    }
                    break;
                }
                case 'get_boss_strategy': {
                    const strategy = buildBossStrategy(state);
                    results.push(strategy);
                    break;
                }
                case 'perform_web_search': {
                    const query = params.query as string;
                    try {
                        const searchRes = await fetch('/api/hoot-search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query }),
                        });
                        const searchData = await searchRes.json();
                        if (searchData.result) {
                            results.push(`🌐 Search Result:\n${searchData.result}`);
                        } else {
                            results.push(`⚠️ Web search failed or returned no results.`);
                        }
                    } catch (err) {
                        logger.error('Web search error', 'Hoot', err);
                        results.push(`⚠️ Web search encountered an error.`);
                    }
                    break;
                }
                case 'generate_vocab_words': {
                    const count = Math.min(5, Math.max(1, (params.count as number) || 3));
                    const difficulty = (params.difficulty as string) || state.vocabCurrentLevel || 'intermediate';
                    const category = params.category as string;
                    try {
                        const genRes = await fetch('/api/vocab/generate-words', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                level: difficulty,
                                count,
                                existingWords: state.vocabWords.map(w => w.word),
                                ...(category ? { category } : {}),
                            }),
                        });
                        const genData = await genRes.json();
                        if (genData.words && genData.words.length > 0) {
                            state.addVocabWords(genData.words);
                            results.push(`✅ Generated ${genData.words.length} new vocab words: ${genData.words.map((w: { word: string }) => w.word).join(', ')}`);
                            addToast(`🦉 Added ${genData.words.length} new words!`, 'success');
                        } else {
                            results.push(`⚠️ Couldn't generate vocabulary words right now.`);
                        }
                    } catch (err) {
                        logger.error('Vocab generation error', 'Hoot', err);
                        results.push(`⚠️ Failed to generate vocabulary words.`);
                    }
                    break;
                }
                case 'batch_reschedule_vocab': {
                    const today = new Date().toISOString().split('T')[0];
                    const overdueIds = state.vocabWords
                        .filter(w => w.nextReviewDate < today)
                        .map(w => w.id);
                    if (overdueIds.length === 0) {
                        results.push(`✅ No overdue vocab words — you're all caught up!`);
                    } else {
                        state.batchRescheduleVocabWords(overdueIds);
                        results.push(`✅ Rescheduled ${overdueIds.length} overdue vocab words to today`);
                        addToast(`🦉 Rescheduled ${overdueIds.length} words`, 'success');
                    }
                    break;
                }
                case 'start_boss_battle': {
                    const difficulty = (params.difficulty as 'Easy' | 'Medium' | 'Hard' | 'Epic') || 'Medium';
                    const theme = (params.theme as string) || '';
                    const hours = (params.durationHours as number) || 48;
                    const bossNames: Record<string, string[]> = {
                        Easy: ['Shadow Wisp', 'Goblin Scout', 'Dust Sprite'],
                        Medium: ['Iron Golem', 'Storm Wraith', 'Frost Wolf'],
                        Hard: ['Obsidian Dragon', 'Void Sentinel', 'Chaos Knight'],
                        Epic: ['The Procrastinator King', 'Entropy Incarnate', 'The Final Exam'],
                    };
                    const names = bossNames[difficulty] || bossNames.Medium;
                    const name = theme
                        ? `${theme.charAt(0).toUpperCase() + theme.slice(1)} ${names[0]}`
                        : names[Math.floor(Math.random() * names.length)];
                    const hpMap = { Easy: 200, Medium: 500, Hard: 1000, Epic: 2000 };
                    const xpMap = { Easy: 100, Medium: 250, Hard: 500, Epic: 1000 };
                    const goldMap = { Easy: 50, Medium: 150, Hard: 300, Epic: 600 };
                    state.startBossBattle({
                        name,
                        description: theme ? `A boss born from ${theme}!` : `A ${difficulty.toLowerCase()} challenge awaits!`,
                        difficulty,
                        hp: hpMap[difficulty],
                        maxHp: hpMap[difficulty],
                        xpReward: xpMap[difficulty],
                        goldReward: goldMap[difficulty],
                        expiresAt: new Date(Date.now() + hours * 3600000).toISOString(),
                    });
                    results.push(`✅ Boss battle started: ${name} (${difficulty}, ${hpMap[difficulty]} HP, ${hours}h deadline)`);
                    addToast(`🦉 Boss spawned: ${name}!`, 'success');
                    break;
                }
                case 'respec_class': {
                    const newClass = params.newClass as string;
                    const validClasses = ['Warrior', 'Mage', 'Rogue', 'Healer', 'Ranger'];
                    if (!validClasses.includes(newClass)) {
                        results.push(`⚠️ Invalid class "${newClass}". Choose: ${validClasses.join(', ')}`);
                    } else {
                        const success = state.respecClass(newClass as CharacterClass);
                        if (success) {
                            results.push(`✅ Class changed to ${newClass}!`);
                            addToast(`🦉 Respecced to ${newClass}!`, 'success');
                        } else {
                            results.push(`⚠️ Not enough gold! Class respec costs 200g, you have ${state.gold}g`);
                        }
                    }
                    break;
                }
                case 'use_item': {
                    const itemName = (params.itemName as string | undefined)?.toLowerCase();
                    if (!itemName) { results.push(`⚠️ No item name provided`); break; }
                    const item = state.inventory.find(i =>
                        i.name.toLowerCase().includes(itemName) && (i.usable || i.consumableEffect)
                    );
                    if (!item) {
                        results.push(`⚠️ Couldn't find a usable item matching "${params.itemName}"`);
                    } else {
                        state.useItem(item.id);
                        results.push(`✅ Used ${item.name}${item.consumableEffect ? ` (${item.consumableEffect.type} +${item.consumableEffect.value})` : ''}`);
                        addToast(`🦉 Used ${item.name}`, 'success');
                    }
                    break;
                }
                case 'set_weekly_plan': {
                    const goal = params.goal as string;
                    const steps = (params.steps as string[]) || [];
                    if (steps.length === 0) {
                        results.push(`⚠️ No steps provided for the plan`);
                    } else {
                        for (const step of steps) {
                            state.addTask(step, 'Medium', undefined, 'Study');
                        }
                        deps.setPlanningContext({
                            goal,
                            steps: steps.map(s => ({ label: s, done: false })),
                            currentStepIndex: 0,
                        });
                        results.push(`✅ Created weekly plan: "${goal}" with ${steps.length} steps (all added as quests)`);
                        addToast(`🦉 Plan created with ${steps.length} steps!`, 'success');
                    }
                    break;
                }
                case 'save_memory_note': {
                    const text = params.text as string;
                    const category = (params.category as 'preference' | 'insight' | 'goal' | 'struggle' | 'general') || 'general';
                    state.addHootMemoryNote(text, category);
                    results.push(`✅ Saved to memory: "${text}"`);
                    break;
                }
                case 'get_coaching_insight': {
                    results.push(`🧠 Coaching insight provided via Google Search grounding`);
                    break;
                }
                case 'get_slight_edge_analytics': {
                    const entries = state.dailyCalendarEntries;
                    const last7 = entries
                        .filter(e => e.date >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
                        .sort((a, b) => b.date.localeCompare(a.date));
                    const scores = last7.map(e => e.productivityScore || 5);
                    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                    const logged = last7.filter(e => e.completed).length;
                    results.push(`📊 Slight Edge (7d): ${logged} days logged, avg productivity ${avg.toFixed(1)}/10. Entries: ${last7.map(e => `${e.date}=${e.productivityScore || 5}/10`).join(', ') || 'none'}`);
                    break;
                }
                case 'log_slight_edge_day': {
                    const today3 = new Date().toISOString().split('T')[0];
                    const summary = (params.summary as string) || '';
                    const learned = (params.learned as string) || '';
                    const score = (params.productivityScore as number) || 5;
                    const completed = params.completed !== false;
                    state.addOrUpdateCalendarEntry(today3, completed, summary, learned, score);
                    results.push(`✅ Slight Edge day logged: ${score}/10, "${summary}"`);
                    addToast(`🦉 Day logged in Slight Edge!`, 'success');
                    break;
                }
                default:
                    results.push(`⚠️ Unknown action: ${action}`);
            }
        } catch (err) {
            logger.error(`Hoot action ${action} failed`, 'Hoot', err);
            results.push(`❌ Failed to execute: ${action}`);
        }
    }

    return results;
}

// ── Helper: Weekly productivity summary ─────────────────────────────
export function buildProductivitySummary(state: GameState): string {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const completedThisWeek = state.tasks.filter(t =>
        t.completed && t.completedAt && t.completedAt >= weekAgoStr
    ).length;

    const habitsAtRisk = state.habits.filter(h =>
        h.streak > 0 && !h.completedDates.includes(todayStr)
    );

    const nextWeekStr = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const urgentGoals = state.goals.filter(g =>
        !g.completed && g.targetDate <= nextWeekStr
    );

    const activeTasks = state.tasks.filter(t => !t.completed);

    const lines: string[] = [
        `📊 PRODUCTIVITY BRIEFING`,
        `Level ${state.level} | ${state.xp} XP | ${state.gold}g | ${state.streak}-day streak`,
        ``,
        `📝 Quests: ${completedThisWeek} completed this week | ${activeTasks.length} active`,
    ];

    if (habitsAtRisk.length > 0) {
        lines.push(`⚠️ Streaks at risk: ${habitsAtRisk.map(h => `${h.name} (${h.streak}🔥)`).join(', ')}`);
    } else {
        lines.push(`✅ All habit streaks safe today`);
    }

    if (urgentGoals.length > 0) {
        lines.push(`🎯 Goals due soon: ${urgentGoals.map(g => `${g.title} (${g.targetDate})`).join(', ')}`);
    }

    const doneToday = state.tasks.filter(t => t.completed && t.completedAt?.startsWith(todayStr)).length;
    lines.push(`📅 Today: ${doneToday} quests completed`);
    lines.push(`⏱️ Focus: ${state.focusSessionsTotal} sessions (${state.focusMinutesTotal} min total)`);

    return lines.join('\n');
}

// ── Helper: Boss battle strategy ────────────────────────────────────
export function buildBossStrategy(state: GameState): string {
    const boss = state.bossBattles.find(b => !b.completed && !b.failed);
    if (!boss) return `🏰 No active boss battle. Visit the Bosses page to start one!`;

    const hpPercent = Math.round((boss.hp / boss.maxHp) * 100);
    const activeTasks = state.tasks.filter(t => !t.completed);
    const highValueTasks = [...activeTasks].sort((a, b) => b.xpReward - a.xpReward).slice(0, 5);

    const lines: string[] = [
        `⚔️ BOSS STRATEGY: ${boss.name}`,
        `HP: ${boss.hp}/${boss.maxHp} (${hpPercent}%) | Difficulty: ${boss.difficulty}`,
        `Rewards: ${boss.xpReward} XP, ${boss.goldReward}g${boss.itemReward ? `, ${boss.itemReward.name}` : ''}`,
        ``,
        `🎯 Recommended targets (highest XP):`,
    ];

    if (highValueTasks.length > 0) {
        highValueTasks.forEach((t, i) => {
            lines.push(`  ${i + 1}. ${t.title} (${t.difficulty}, ${t.xpReward} XP)`);
        });
    } else {
        lines.push(`  No active quests — create some to damage the boss!`);
    }

    const weapon = state.equippedItems?.weapon;
    if (weapon) {
        lines.push(`\n🗡️ Equipped weapon: ${weapon.name}${weapon.stats?.xpBonus ? ` (+${weapon.stats.xpBonus} XP bonus)` : ''}`);
    }

    const consumables = state.inventory.filter(i => i.usable || i.consumableEffect);
    if (consumables.length > 0) {
        lines.push(`🧪 Available consumables: ${consumables.map(c => `${c.name} x${c.quantity}`).join(', ')}`);
    }

    return lines.join('\n');
}
