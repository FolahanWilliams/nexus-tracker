
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import {
  LayoutDashboard,
  Target,
  BarChart3,
  User,
  Activity,
  Sparkles,
  Map,
  Sword,
  Settings,
  Repeat2,
  Timer,
  Flag,
  BookOpen,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useSyncStore, SyncStatus } from '@/lib/syncStatus';

const SYNC_CONFIG: Record<SyncStatus, { color: string; label: string; pulse: boolean }> = {
  idle:    { color: 'bg-[var(--color-text-secondary)]', label: 'IDLE',    pulse: false },
  syncing: { color: 'bg-[var(--color-blue)]',           label: 'SYNCING', pulse: true  },
  synced:  { color: 'bg-[var(--color-green)]',          label: 'SYNCED',  pulse: false },
  error:   { color: 'bg-red-400',                       label: 'SYNC ERR', pulse: false },
  offline: { color: 'bg-orange-400',                    label: 'OFFLINE', pulse: false },
};

const navGroups = [
  {
    label: 'DAILY',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/quests', label: 'Quests', icon: Target },
      { href: '/habits', label: 'Habits', icon: Repeat2 },
      { href: '/focus', label: 'Focus Timer', icon: Timer },
      { href: '/goals', label: 'Goals', icon: Flag },
      { href: '/reflection', label: 'Check-In', icon: BookOpen },
    ],
  },
  {
    label: 'ADVENTURE',
    items: [
      { href: '/chains', label: 'Quest Chains', icon: Map },
      { href: '/bosses', label: 'Boss Battles', icon: Sword },
    ],
  },
  {
    label: 'CHARACTER',
    items: [
      { href: '/character', label: 'Character & Skills', icon: User },
      { href: '/inventory', label: 'Items & Shop', icon: Sparkles },
    ],
  },
  {
    label: 'RECORDS',
    items: [
      { href: '/analytics', label: 'Progress & Records', icon: BarChart3 },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const { level, title, characterName } = useGameStore();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] z-50 hidden lg:flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-[var(--color-blue)] flex items-center justify-center">
          <Activity className="text-white" size={18} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white uppercase">QuestFlow</h1>
          <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">AI Productivity RPG</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-3 flex flex-col px-2 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-bold tracking-widest text-[var(--color-text-secondary)] opacity-60 uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-all ${isActive
                      ? 'bg-[var(--color-bg-hover)] text-white border-l-2 border-[var(--color-green)]'
                      : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-hover)]'
                      }`}
                  >
                    <Icon size={16} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* System Status / User */}
      <div className="p-4 border-t border-[var(--color-border)] space-y-3">
        {/* Level Indicator */}
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-[var(--color-text-secondary)]">LEVEL {level}</span>
          <span className="text-[var(--color-blue)] font-mono">{title}</span>
        </div>

        <UserSection characterName={characterName} />
      </div>
    </nav>
  );
}

function UserSection({ characterName }: { characterName: string }) {
  const { user, signOut } = useAuth();
  const syncStatus = useSyncStore((s) => s.status);
  const syncError = useSyncStore((s) => s.error);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name;
  const cfg = SYNC_CONFIG[syncStatus];

  return (
    <div className="flex items-center gap-3 p-2 rounded-md bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-8 h-8 rounded" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-8 h-8 rounded bg-[var(--color-bg-card)] flex items-center justify-center">
          <User size={14} className="text-[var(--color-text-secondary)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{fullName || characterName}</p>
        <div className="flex items-center gap-1" title={syncError || undefined}>
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''}`} />
          <p className="text-[10px] text-[var(--color-text-secondary)]">{cfg.label}</p>
        </div>
      </div>
      {user && (
        <button
          onClick={signOut}
          className="p-1.5 rounded hover:bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      )}
    </div>
  );
}
