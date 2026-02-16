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
  Zap,
  Flame,
  User
} from 'lucide-react';
import UserMenu from './UserMenu';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
];

export default function Navigation() {
  const pathname = usePathname();
  const { level, gold, streak, xp } = useGameStore();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-72 glass z-50 hidden lg:flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse-glow">
            <Zap className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">QuestFlow</h1>
            <p className="text-xs text-white/50">Level {level}</p>
          </div>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="p-4 grid grid-cols-3 gap-2 border-b border-white/10">
        <div className="text-center p-3 rounded-lg bg-white/5">
          <Flame className="mx-auto mb-1 text-orange-400" size={18} />
          <p className="text-lg font-bold">{streak}</p>
          <p className="text-[10px] text-white/50">Streak</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/5">
          <Zap className="mx-auto mb-1 text-yellow-400" size={18} />
          <p className="text-lg font-bold">{gold}</p>
          <p className="text-[10px] text-white/50">Gold</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/5">
          <Trophy className="mx-auto mb-1 text-purple-400" size={18} />
          <p className="text-lg font-bold">{xp}</p>
          <p className="text-[10px] text-white/50">XP</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon size={20} className={isActive ? 'animate-bounce-subtle' : ''} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <UserMenu />
      </div>
    </nav>
  );
}
