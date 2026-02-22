'use client';

import { useGameStore } from '@/store/useGameStore';
import { useEffect, useRef } from 'react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAmbientSound } from '@/hooks/useAmbientSound';

export default function SoundManager() {
    const { gold, level, tasks, bossBattles, achievements, inventory } = useGameStore();
    const { playCoin, playLevelUp, playSuccess, playBoss, playHit, playAchievement, playCraft } = useSoundEffects();

    // Initialize ambient soundscape
    useAmbientSound();

    // Refs to track previous state for change detection
    const prevGold = useRef(gold);
    const prevLevel = useRef(level);
    const prevTasks = useRef(tasks);
    const prevBossBattles = useRef(bossBattles);
    const prevAchievements = useRef(achievements);
    const prevInventoryCount = useRef(inventory.length);

    // Effect for Gold (Gain/Loss)
    useEffect(() => {
        if (gold > prevGold.current) {
            playCoin();
        }
        prevGold.current = gold;
    }, [gold, playCoin]);

    // Effect for Level Up
    useEffect(() => {
        if (level > prevLevel.current && prevLevel.current !== 0) {
            playLevelUp();
        }
        prevLevel.current = level;
    }, [level, playLevelUp]);

    // Effect for Task Completion
    useEffect(() => {
        const completedCount = tasks.filter(t => t.completed).length;
        const prevCompletedCount = prevTasks.current.filter(t => t.completed).length;

        if (completedCount > prevCompletedCount) {
            playSuccess();
        }
        prevTasks.current = tasks;
    }, [tasks, playSuccess]);

    // Effect for Boss Battles (Damage/Victory/Failure)
    useEffect(() => {
        bossBattles.forEach(boss => {
            const prevBoss = prevBossBattles.current.find(b => b.id === boss.id);
            if (!prevBoss) return;

            // Boss took damage
            if (boss.hp < prevBoss.hp) {
                playHit();
            }

            // Boss defeated
            if (boss.completed && !prevBoss.completed) {
                playBoss(); // Play special boss defeat sound
            }
        });
        prevBossBattles.current = bossBattles;
    }, [bossBattles, playHit, playBoss]);

    // Effect for Achievements
    useEffect(() => {
        if (achievements.length > prevAchievements.current.length) {
            playAchievement();
        }
        prevAchievements.current = achievements;
    }, [achievements, playAchievement]);

    // Effect for Inventory/Crafting
    useEffect(() => {
        if (inventory.length > prevInventoryCount.current) {
            // Check if gold also decreased, implying a purchase? 
            // Or just play craft sound if it's the most likely source of new items.
            playCraft();
        }
        prevInventoryCount.current = inventory.length;
    }, [inventory, playCraft]);

    return null;
}
