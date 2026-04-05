/**
 * Thin React wrapper around `ingestWantedDid` from `@/lib/ambitionIngestion`.
 * The pure lib function contains the actual logic so it can be called from
 * non-React code (e.g. HootActionExecutor).
 */

import { useCallback } from 'react';
import { ingestWantedDid as ingestWantedDidLib } from '@/lib/ambitionIngestion';

export function useAmbitionIngestion() {
    const ingestWantedDid = useCallback(
        (date: string, wanted: string, did: string) => ingestWantedDidLib(date, wanted, did),
        []
    );

    return { ingestWantedDid };
}
