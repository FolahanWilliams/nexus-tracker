import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateEnv } from './env';

// Validate env on first import (server-side only — this file is only
// imported by API routes which run on the server).
if (typeof window === 'undefined') {
    validateEnv();
}

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

/**
 * Type-safe wrapper: extract JSON and verify it's a non-null object.
 * Returns `Record<string, unknown>` so callers can safely access
 * properties with type narrowing instead of `as any`.
 */
export function extractJSONObject(text: string): Record<string, unknown> {
    const parsed = extractJSON(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Expected JSON object from AI response');
    }
    return parsed as Record<string, unknown>;
}
