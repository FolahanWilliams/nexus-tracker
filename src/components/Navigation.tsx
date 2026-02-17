
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import {
  LayoutDashboard,
  Target,
  ShoppingBag,
  BarChart3,
  Trophy,
  User,
  Activity,
  Map,
  Sparkles,
  Sword,
  Hammer,
  Store,
  Crown,
  Settings,
  Repeat2,
  Timer,
  Flag
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/habits', label: 'Habits', icon: Repeat2 },
  { href: '/focus', label: 'Focus Timer', icon: Timer },
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/chains', label: 'Quest Chains', icon: Map },
  { href: '/bosses', label: 'Boss Battles', icon: Sword },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/auction', label: 'Auction House', icon: Store },
  { href: '/inventory', label: 'Inventory', icon: Sparkles },
  { href: '/skills', label: 'Skills', icon: Activity },
  { href: '/crafting', label: 'Crafting', icon: Hammer },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
  { href: '/leaderboard', label: 'Leaderboard', icon: Crown },
  { href: '/settings', label: 'Settings', icon: Settings },
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
      <div className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
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

      {/* System Status / User */}
      <div className="p-4 border-t border-[var(--border)] space-y-3">
        {/* Level Indicator */}
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-[var(--text-secondary)]">LEVEL {level}</span>
          <span className="text-[var(--accent-blue)] font-mono">{title}</span>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-md bg-[var(--bg-hover)] border border-[var(--border)]">
          <div className="w-8 h-8 rounded bg-[var(--bg-card)] flex items-center justify-center">
            <User size={14} className="text-[var(--text-secondary)]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white">{characterName}</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
              <p className="text-[10px] text-[var(--text-secondary)]">ONLINE</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
