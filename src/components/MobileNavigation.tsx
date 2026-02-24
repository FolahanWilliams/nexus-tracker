'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  Target,
  BarChart3,
  Sword,
  Sparkles,
  Settings,
  X,
  MoreHorizontal,
  Repeat2,
  Timer,
  Flag,
  Map,
  User,
  BookOpen,
  Library,
} from 'lucide-react';

const mainNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/habits', label: 'Habits', icon: Repeat2 },
  { href: '/focus', label: 'Focus', icon: Timer },
  { href: '/reflection', label: 'Check-In', icon: BookOpen },
];

const secondaryNavItems = [
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/wordforge', label: 'WordForge', icon: Library },
  { href: '/chains', label: 'Chains', icon: Map },
  { href: '/bosses', label: 'Boss', icon: Sword },
  { href: '/character', label: 'Character', icon: User },
  { href: '/inventory', label: 'Items', icon: Sparkles },
  { href: '/analytics', label: 'Progress', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileNavigation() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden" aria-label="Main navigation">
        <div className="bg-[var(--color-bg-dark)]/90 backdrop-blur-xl border-t border-[var(--color-border)]/50">
          <div className="flex justify-around items-center px-1 py-1.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-300 ${isActive
                    ? 'text-[var(--color-purple)]'
                    : 'text-[var(--color-text-muted)] active:text-[var(--color-text-secondary)]'
                    }`}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 ${isActive
                    ? 'bg-[var(--color-purple)]/15 shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                    : ''
                    }`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </Link>
              );
            })}

            {/* More button */}
            <button
              onClick={() => setShowMore(!showMore)}
              aria-expanded={showMore}
              aria-label="More navigation options"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-300 ${showMore
                ? 'text-[var(--color-purple)]'
                : 'text-[var(--color-text-muted)]'
                }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${showMore
                ? 'bg-[var(--color-purple)]/15 shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                : ''
                }`}>
                {showMore ? <X size={20} strokeWidth={2.5} /> : <MoreHorizontal size={20} />}
              </div>
              <span className={`text-[10px] ${showMore ? 'font-bold' : 'font-medium'}`}>More</span>
            </button>
          </div>
        </div>
      </nav>

      {/* More menu overlay */}
      {showMore && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-20 left-3 right-3 bg-[var(--color-bg-card)]/95 backdrop-blur-xl rounded-2xl border border-[var(--color-border)]/50 p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${isActive
                      ? 'bg-[var(--color-purple)]/15 text-[var(--color-purple)] shadow-[0_0_12px_rgba(167,139,250,0.15)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-dark)] active:scale-95'
                      }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
