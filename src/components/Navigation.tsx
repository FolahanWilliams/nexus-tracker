
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
  Activity
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/quests', label: 'Operations', icon: Target },
  { href: '/shop', label: 'Acquisitions', icon: ShoppingBag },
  { href: '/analytics', label: 'Performance', icon: BarChart3 },
  { href: '/achievements', label: 'Milestones', icon: Trophy },
];

export default function Navigation() {
  const pathname = usePathname();
  const { level } = useGameStore();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-panel)] border-r border-[var(--border)] z-50 hidden lg:flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-[var(--accent-blue)] flex items-center justify-center">
          <Activity className="text-white" size={18} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white uppercase">Keystone</h1>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Analytics v3.0</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 flex flex-col gap-1 px-2">
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
          <span className="text-[var(--text-secondary)]">CLEARANCE</span>
          <span className="text-[var(--accent-blue)] font-mono">LVL {level}</span>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-md bg-[var(--bg-hover)] border border-[var(--border)]">
          <div className="w-8 h-8 rounded bg-[var(--bg-card)] flex items-center justify-center">
            <User size={14} className="text-[var(--text-secondary)]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Guest User</p>
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
