'use client';

import { useEffect } from 'react';
import { useSyncStore, SyncStatus } from '@/lib/syncStatus';
import { Cloud, CloudOff, RefreshCw, Check, AlertTriangle } from 'lucide-react';

const statusConfig: Record<SyncStatus, { icon: typeof Cloud; color: string; label: string }> = {
    idle: { icon: Cloud, color: 'var(--color-text-muted)', label: 'Ready' },
    syncing: { icon: RefreshCw, color: 'var(--color-blue)', label: 'Saving...' },
    synced: { icon: Check, color: 'var(--color-green)', label: 'Saved' },
    error: { icon: AlertTriangle, color: 'var(--color-red)', label: 'Sync failed' },
    offline: { icon: CloudOff, color: 'var(--color-orange)', label: 'Offline' },
};

export default function SyncStatusIndicator() {
    const { status, lastSyncedAt, error } = useSyncStore();

    // Detect online/offline
    useEffect(() => {
        const setOffline = () => useSyncStore.getState().setStatus('offline');
        const setOnline = () => {
            const s = useSyncStore.getState();
            if (s.status === 'offline') s.setStatus('idle');
        };
        window.addEventListener('offline', setOffline);
        window.addEventListener('online', setOnline);
        if (!navigator.onLine) setOffline();
        return () => {
            window.removeEventListener('offline', setOffline);
            window.removeEventListener('online', setOnline);
        };
    }, []);

    const config = statusConfig[status];
    const Icon = config.icon;

    // Format last synced time
    const timeAgo = lastSyncedAt ? formatTimeAgo(lastSyncedAt) : null;

    return (
        <div
            className="flex items-center gap-1.5 text-[10px] font-medium"
            title={error ? `Error: ${error}` : timeAgo ? `Last saved ${timeAgo}` : 'Not synced yet'}
        >
            <Icon
                size={11}
                style={{ color: config.color }}
                className={status === 'syncing' ? 'animate-spin' : ''}
            />
            <span style={{ color: config.color }}>
                {status === 'synced' && timeAgo ? timeAgo : config.label}
            </span>
        </div>
    );
}

function formatTimeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 10) return 'Just saved';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
}
