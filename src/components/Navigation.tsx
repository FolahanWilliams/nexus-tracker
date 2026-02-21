
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
  LogOut
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const navGroups = [
  {
    label: 'DAILY',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/quests', label: 'Quests', icon: Target },
      { href: '/habits', label: 'Habits', icon: Repeat2 },
      { href: '/focus', label: 'Focus Timer', icon: Timer },
      { href: '/goals', label: 'Goals', icon: Flag },
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
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-panel)] border-r border-[var(--border)] z-50 hidden lg:flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-[var(--accent-blue)] flex items-center justify-center">
          <Activity className="text-white" size={18} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white uppercase">QuestFlow</h1>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">AI Productivity RPG</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-3 flex flex-col px-2 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] opacity-60 uppercase">
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
                      ? 'bg-[var(--bg-hover)] text-white border-l-2 border-[var(--accent-green)]'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
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
      <div className="p-4 border-t border-[var(--border)] space-y-3">
        {/* Level Indicator */}
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-[var(--text-secondary)]">LEVEL {level}</span>
          <span className="text-[var(--accent-blue)] font-mono">{title}</span>
        </div>

        <UserSection characterName={characterName} />
      </div>
    </nav>
  );
}

function UserSection({ characterName }: { characterName: string }) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex items-center gap-3 p-2 rounded-md bg-[var(--bg-hover)] border border-[var(--border)]">
      {user?.photoURL ? (
        <img src={user.photoURL} alt="" className="w-8 h-8 rounded" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-8 h-8 rounded bg-[var(--bg-card)] flex items-center justify-center">
          <User size={14} className="text-[var(--text-secondary)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{user?.displayName || characterName}</p>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
          <p className="text-[10px] text-[var(--text-secondary)]">ONLINE</p>
        </div>
      </div>
      {user && (
        <button
          onClick={signOut}
          className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      )}
    </div>
  );
}
