import { NextResponse } from 'next/server';
import { genAI, extractJSON } from '@/lib/gemini';
import { logger } from '@/lib/logger';
import { hasApiKeyOrMock } from '@/lib/api-helpers';

const MOCK_WORDS = [
    {
        word: 'Ephemeral',
        definition: 'Lasting for a very short time; transient.',
        partOfSpeech: 'adjective',
        examples: [
            'The ephemeral beauty of cherry blossoms makes them all the more precious.',
            'Social media fame is often ephemeral, fading as quickly as it arrives.',
        ],
        mnemonic: 'Think "E-FEM-eral" — like a femme fatale who appears briefly and vanishes.',
        pronunciation: '/ɪˈfɛm.ər.əl/',
        difficulty: 'intermediate',
        category: 'SAT',
        etymology: 'From Greek ephemeros "lasting only a day" (epi "on" + hemera "day")',
        relatedWords: ['transient', 'fleeting', 'evanescent', 'momentary'],
        antonym: 'permanent',
    },
    {
        word: 'Sycophant',
        definition: 'A person who acts obsequiously toward someone important in order to gain advantage; a flatterer.',
        partOfSpeech: 'noun',
        examples: [
            'The CEO surrounded himself with sycophants who never challenged his decisions.',
            'She saw through the sycophant\'s hollow compliments immediately.',
        ],
        mnemonic: 'SYCO-phant → "psycho fan" — someone who obsessively flatters.',
        pronunciation: '/ˈsɪk.ə.fænt/',
        difficulty: 'advanced',
        category: 'SAT',
        etymology: 'From Greek sykophantes "informer, slanderer" (sykon "fig" + phainein "to show")',
        relatedWords: ['toady', 'flatterer', 'fawner', 'obsequious'],
        antonym: 'critic',
    },
    {
        word: 'Ubiquitous',
        definition: 'Present, appearing, or found everywhere.',
        partOfSpeech: 'adjective',
        examples: [
            'Smartphones have become ubiquitous in modern society.',
            'The ubiquitous fast-food chains can be found in almost every city.',
        ],
        mnemonic: 'UBI-quit-ous → "you be quit" everywhere — because it\'s everywhere, you can\'t escape it.',
        pronunciation: '/juːˈbɪk.wɪ.təs/',
        difficulty: 'intermediate',
        category: 'academic',
        etymology: 'From Latin ubique "everywhere" (ubi "where" + -que "and, also")',
        relatedWords: ['omnipresent', 'pervasive', 'universal', 'prevalent'],
        antonym: 'rare',
    },
];

export async function POST(request: Request) {
    try {
        const { currentLevel, existingWords, count } = await request.json();
        const wordCount = Math.min(Math.max(count || 4, 3), 5);

        const mock = hasApiKeyOrMock({
            words: MOCK_WORDS.slice(0, wordCount),
        });
        if (mock) return mock;

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
        });

        const existingList = (existingWords || []).slice(-100).join(', ');

        const prompt = `You are a vocabulary tutor AI for an advanced learner who wants to expand their vocabulary with sophisticated, powerful words.

Current learner level: ${currentLevel || 'intermediate'}
Words they already know (DO NOT repeat these): ${existingList || 'none yet'}

Generate exactly ${wordCount} vocabulary words. Follow these guidelines:

WORD SELECTION STRATEGY:
- Mix of word types: ~40% advanced academic/literary words, ~30% SAT-level words, ~30% sophisticated everyday words
- For "beginner" level: common but often misused words (e.g., "comprise", "literally", "ironic")
- For "intermediate" level: strong SAT words and academic vocabulary (e.g., "equivocate", "paradigm", "dichotomy")
- For "advanced" level: literary, rhetorical, and domain-crossing words (e.g., "palimpsest", "synecdoche", "lacuna")
- For "expert" level: rare, erudite words that signal mastery (e.g., "apophenia", "sesquipedalian", "tmesis")
- Favor words that are genuinely useful in writing and conversation, not just obscure for obscurity's sake
- Include at least one SAT-category word per batch

For each word, provide:
- word: The word (capitalize first letter)
- definition: Clear, concise definition
- partOfSpeech: (noun, verb, adjective, adverb, etc.)
- examples: Array of 2 example sentences showing the word used naturally in different contexts
- mnemonic: A creative, memorable memory aid (wordplay, visual association, or etymology-based)
- pronunciation: IPA pronunciation
- difficulty: "${currentLevel || 'intermediate'}"
- category: One of "SAT", "academic", "literary", "technical", "rhetorical"
- etymology: Brief word origin (language roots, historical derivation, max 1-2 sentences)
- relatedWords: Array of 3-5 synonyms, near-synonyms, or closely related terms
- antonym: A single clear antonym or contrasting word (if applicable, otherwise "none")

Output ONLY a valid JSON object: { "words": [...] }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const data = extractJSON(text) as { words: unknown[] };

        if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
            throw new Error('Invalid response structure');
        }

        // Validate each word has required fields, discard malformed entries
        const validWords = (data.words as Record<string, unknown>[]).filter(w =>
            typeof w.word === 'string' &&
            typeof w.definition === 'string' &&
            typeof w.partOfSpeech === 'string' &&
            Array.isArray(w.examples)
        );

        if (validWords.length === 0) {
            throw new Error('All words failed validation');
        }

        return NextResponse.json({ words: validWords });
    } catch (error) {
        logger.error('Vocab generation error', 'generate-words', error);
        return NextResponse.json({
            words: MOCK_WORDS,
            isMock: true,
            error: 'AI unavailable — using fallback words',
        });
    }
}
