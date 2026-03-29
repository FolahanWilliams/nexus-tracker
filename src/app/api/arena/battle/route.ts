import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { hasApiKeyOrMock } from '@/lib/api-helpers';
import { withAuth } from '@/lib/with-auth';
import { sanitizePromptInput } from '@/lib/sanitize';
import { generateLetterPool, canFormWord } from '@/lib/letterScoring';
import { BATTLE_CONFIG } from '@/lib/arenaConstants';
import type { ArenaDifficulty } from '@/store/types';

interface BattleRequest {
    action: 'generate_enemy' | 'validate_word' | 'generate_letters';
    difficulty?: ArenaDifficulty;
    level?: number;
    winStreak?: number;
    word?: string;
    letters?: string[];
}

const MOCK_ENEMIES = {
    easy: { name: 'Procrastination Imp', description: 'A mischievous imp that feeds on wasted time.', hp: 60, maxHp: 60, attackDamage: 8, specialAbility: null, imageHint: 'goblin' },
    medium: { name: 'Distraction Wraith', description: 'A ghostly figure that scatters your focus across a thousand tabs.', hp: 100, maxHp: 100, attackDamage: 12, specialAbility: 'removes_vowel', imageHint: 'wraith' },
    hard: { name: 'Burnout Dragon', description: 'An ancient dragon whose flames leave only exhaustion in their wake.', hp: 150, maxHp: 150, attackDamage: 20, specialAbility: 'double_attack', imageHint: 'dragon' },
    legendary: { name: 'The Entropy Lich', description: 'A being of pure chaos that unravels all order and discipline.', hp: 220, maxHp: 220, attackDamage: 28, specialAbility: 'steals_letter', imageHint: 'lich' },
};

export const POST = withAuth(async (request) => {
    try {
        const raw = await request.json();
        if (raw.word) raw.word = sanitizePromptInput(raw.word, 100);
        const body = raw as BattleRequest;

        if (body.action === 'generate_letters') {
            const difficulty = body.difficulty || 'medium';
            const config = BATTLE_CONFIG[difficulty];
            const pool = generateLetterPool(config.poolSize);
            return NextResponse.json({ letters: pool });
        }

        if (body.action === 'validate_word') {
            const word = (body.word || '').trim().toUpperCase();
            const letters = body.letters || [];

            if (word.length < 2) {
                return NextResponse.json({ valid: false, reason: 'Word must be at least 2 letters.' });
            }

            if (!canFormWord(word, letters)) {
                return NextResponse.json({ valid: false, reason: 'Cannot form this word from available letters.' });
            }

            const mockResponse = hasApiKeyOrMock({ valid: true, definition: 'A valid English word.', isAdvanced: false });
            if (mockResponse) return mockResponse;

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `Is "${word}" a valid standard English dictionary word? Not proper nouns, abbreviations, or slang.

Output ONLY valid JSON: { "valid": true|false, "definition": "brief definition if valid, empty string if not", "isAdvanced": true|false }`
            );
            const text = result.response.text();
            const parsed = extractJSON(text) as { valid: boolean; definition: string; isAdvanced: boolean };
            return NextResponse.json(parsed);
        }

        if (body.action === 'generate_enemy') {
            const difficulty = body.difficulty || 'medium';
            const mockEnemy = MOCK_ENEMIES[difficulty];
            const mockResp = hasApiKeyOrMock({ enemy: { id: crypto.randomUUID(), difficulty, ...mockEnemy } });
            if (mockResp) return mockResp;

            const level = body.level || 1;
            const winStreak = body.winStreak || 0;
            const config = BATTLE_CONFIG[difficulty];

            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            const result = await model.generateContent(
                `Generate a word battle enemy for a vocabulary RPG game.
Player level: ${level}. Win streak: ${winStreak}. Difficulty: ${difficulty}.

Create an enemy with a creative fantasy name, a brief description (1-2 sentences),
HP between ${config.enemyHpRange[0]}-${config.enemyHpRange[1]},
attack damage per turn between ${config.enemyDamageRange[0]}-${config.enemyDamageRange[1]},
and optionally a special ability from: ["removes_vowel", "steals_letter", "time_pressure", "double_attack", null].

Output ONLY valid JSON: { "name": "...", "description": "...", "hp": N, "attackDamage": N, "specialAbility": "..." or null, "imageHint": "dragon|goblin|lich|demon|troll|spider|wolf|serpent|golem|wraith" }`
            );

            const text = result.response.text();
            const parsed = extractJSON(text) as Record<string, unknown>;
            const hp = Number(parsed.hp) || config.enemyHpRange[0];
            const enemy = {
                id: crypto.randomUUID(),
                name: String(parsed.name || mockEnemy.name),
                description: String(parsed.description || mockEnemy.description),
                difficulty,
                hp,
                maxHp: hp,
                attackDamage: Number(parsed.attackDamage) || config.enemyDamageRange[0],
                specialAbility: parsed.specialAbility as string | null,
                imageHint: String(parsed.imageHint || 'goblin'),
            };

            return NextResponse.json({ enemy });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        const difficulty = 'medium';
        const mockEnemy = MOCK_ENEMIES[difficulty];
        return NextResponse.json({
            enemy: { id: crypto.randomUUID(), difficulty, ...mockEnemy },
            isMock: true,
            error: 'AI unavailable',
        }, { status: 500 });
    }
}, { rateLimitMax: 30 });
