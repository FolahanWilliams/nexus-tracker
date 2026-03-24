'use client';

import { useState, useCallback, useRef } from 'react';
import { useToastStore } from '@/components/ToastContainer';
import { logger } from '@/lib/logger';

interface UseAIFetchOptions {
    /** Timeout in ms (default 30000). */
    timeout?: number;
    /** Logger tag for error messages. */
    logTag?: string;
}

interface UseAIFetchReturn<T> {
    /** Execute the fetch. Returns data on success, null on failure. */
    execute: (payload: unknown) => Promise<T | null>;
    /** Whether a request is in progress. */
    isLoading: boolean;
    /** Last error message, or null. */
    error: string | null;
}

/**
 * Shared hook for AI API calls. Eliminates duplicated fetch + loading state +
 * error handling + toast patterns across QuestsTab, BossesTab, ChainsTab,
 * WeeklyPlanner, DailyWordsTab, etc.
 *
 * Usage:
 * ```ts
 * const { execute, isLoading } = useAIFetch<QuestData>('/api/generate-quest');
 * const data = await execute({ prompt, context });
 * if (data) { // handle success }
 * ```
 */
export function useAIFetch<T = Record<string, unknown>>(
    endpoint: string,
    options: UseAIFetchOptions = {},
): UseAIFetchReturn<T> {
    const { timeout = 30000, logTag = 'AI' } = options;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const addToast = useToastStore((s) => s.addToast);

    // Prevent stale closure issues with rapid calls
    const abortRef = useRef<AbortController | null>(null);

    const execute = useCallback(async (payload: unknown): Promise<T | null> => {
        // Abort any in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: timeout > 0
                    ? AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)])
                    : controller.signal,
            });

            const data = await response.json();

            if (!response.ok) {
                const msg = data?.error || `Request failed (${response.status})`;
                throw new Error(msg);
            }

            return data as T;
        } catch (err) {
            if (controller.signal.aborted) return null; // intentionally cancelled

            const msg = err instanceof DOMException && err.name === 'TimeoutError'
                ? 'AI request timed out. Try again.'
                : err instanceof Error
                    ? err.message
                    : 'Network error. Check your connection.';

            setError(msg);
            addToast(msg, 'error');
            logger.error(`${logTag}: ${msg}`, logTag, err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [endpoint, timeout, logTag, addToast]);

    return { execute, isLoading, error };
}
