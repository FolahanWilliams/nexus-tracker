import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Shared Gemini AI client instance.
 * Used by all API routes that call Google's Generative AI.
 */
export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

/**
 * Extract a JSON value from a Gemini response that may contain markdown
 * fences, prose, or raw JSON.
 *
 * Tries three strategies in order:
 * 1. Direct JSON.parse of the full text
 * 2. Extract from ```json ... ``` fenced blocks
 * 3. Extract the first { ... } brace-delimited substring
 *
 * Throws if none succeed.
 */
export function extractJSON(text: string): unknown {
    // Strategy 1: the response is already valid JSON
    try {
        return JSON.parse(text);
    } catch {
        // Not valid JSON as-is — try extracting from markdown fences
    }

    // Strategy 2: look for ```json ... ``` fenced code blocks
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
        try {
            return JSON.parse(fenced[1].trim());
        } catch {
            // Fenced block wasn't valid JSON — fall through to brace matching
        }
    }

    // Strategy 3: extract the first top-level { ... } substring
    const braces = text.match(/\{[\s\S]*\}/);
    if (braces) {
        try {
            return JSON.parse(braces[0]);
        } catch {
            // Brace-delimited text wasn't valid JSON either
        }
    }

    throw new Error('Could not extract JSON from response');
}
