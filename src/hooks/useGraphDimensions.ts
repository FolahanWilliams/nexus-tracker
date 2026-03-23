import { useState, useEffect } from 'react';

/**
 * Returns responsive graph dimensions that update on window resize.
 * Accounts for the 256px sidebar on desktop (lg breakpoint).
 */
export function useGraphDimensions(isFullscreen: boolean, headerHeight: number) {
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        function update() {
            if (typeof window === 'undefined') return;
            const isDesktop = window.innerWidth >= 1024; // lg breakpoint
            const sidebarWidth = isFullscreen ? 0 : isDesktop ? 256 : 0;
            setDimensions({
                width: window.innerWidth - sidebarWidth,
                height: isFullscreen ? window.innerHeight : window.innerHeight - headerHeight,
            });
        }
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [isFullscreen, headerHeight]);

    return dimensions;
}
