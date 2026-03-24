/**
 * Shared utilities for AI generation API routes.
 *
 * Eliminates duplicated model setup, difficulty validation, and error
 * response patterns across generate-quest, generate-boss, generate-chain,
 * and task-breakdown routes.
 */

import { genAI, extractJSON } from './gemini';

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Epic'] as const;
const VALID_CATEGORIES = ['Study', 'Health', 'Creative', 'Work', 'Social', 'Personal', 'Other'] as const;

/**
 * Create a Gemini model pre-configured with Google Search grounding.
 * All AI generation routes use this same setup.
 */
export function createSearchGroundedModel(jsonMode = false) {
    return genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        ...(jsonMode ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- googleSearch not in SDK types
        tools: [{ googleSearch: {} } as any],
    });
}

/**
 * Generate content and extract the JSON response in one call.
 */
export async function generateAndExtractJSON(prompt: string, jsonMode = false): Promise<Record<string, unknown>> {
    const model = createSearchGroundedModel(jsonMode);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = extractJSON(text);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Expected JSON object from AI response');
    }
    return data as Record<string, unknown>;
}

/**
 * Validate and normalize a difficulty string.
 */
export function validateDifficulty(value: unknown, fallback = 'Medium'): string {
    if (typeof value === 'string' && (VALID_DIFFICULTIES as readonly string[]).includes(value)) return value;
    return fallback;
}

/**
 * Validate and normalize a category string.
 */
export function validateCategory(value: unknown, fallback = 'Other'): string {
    if (typeof value === 'string' && (VALID_CATEGORIES as readonly string[]).includes(value)) return value;
    return fallback;
}
