/**
 * Letter pool generation for Word Battle Arena.
 *
 * Generates weighted-random pools of letters that guarantee at least
 * 2 vowels and 1 common consonant for playability.
 */

import { LETTER_FREQUENCIES } from './arenaConstants';

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const COMMON_CONSONANTS = ['R', 'S', 'T', 'N', 'L'];
const ALL_LETTERS = Object.keys(LETTER_FREQUENCIES);

/** Pick a single weighted-random letter from the frequency table. */
function weightedRandomLetter(exclude?: Set<string>): string {
    const entries = ALL_LETTERS.filter(l => !exclude?.has(l));
    const totalWeight = entries.reduce((sum, l) => sum + LETTER_FREQUENCIES[l], 0);
    let roll = Math.random() * totalWeight;
    for (const letter of entries) {
        roll -= LETTER_FREQUENCIES[letter];
        if (roll <= 0) return letter;
    }
    return entries[entries.length - 1];
}

/**
 * Generate a pool of `size` letters with guaranteed vowels and consonants.
 *
 * @param size Number of letters (typically 8-12)
 * @returns Array of uppercase letters
 */
export function generateLetterPool(size: number): string[] {
    const pool: string[] = [];

    // Guarantee at least 2 vowels
    const vowel1 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const vowel2 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    pool.push(vowel1, vowel2);

    // Guarantee at least 1 common consonant
    const consonant = COMMON_CONSONANTS[Math.floor(Math.random() * COMMON_CONSONANTS.length)];
    pool.push(consonant);

    // Fill the rest with weighted random picks
    while (pool.length < size) {
        pool.push(weightedRandomLetter());
    }

    // Shuffle using Fisher-Yates
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool;
}

/**
 * Check whether a word can be formed from the given letter pool.
 * Each letter in the pool can only be used once.
 */
export function canFormWord(word: string, pool: string[]): boolean {
    const available = [...pool.map(l => l.toUpperCase())];
    for (const ch of word.toUpperCase()) {
        const idx = available.indexOf(ch);
        if (idx === -1) return false;
        available.splice(idx, 1);
    }
    return true;
}
