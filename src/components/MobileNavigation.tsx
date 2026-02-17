'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Home, 
  Target, 
  ShoppingBag, 
  BarChart3, 
  Trophy,
  Sword,
  Sparkles,
  Settings,
  Menu,
  X,
  Hammer,
  Crown,
  MoreHorizontal,
  Repeat2,
  Timer,
  Flag
} from 'lucide-react';

const mainNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/habits', label: 'Habits', icon: Repeat2 },
  { href: '/focus', label: 'Focus', icon: Timer },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
];

const secondaryNavItems = [
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/bosses', label: 'Boss', icon: Sword },
  { href: '/inventory', label: 'Items', icon: Sparkles },
  { href: '/crafting', label: 'Craft', icon: Hammer },
  { href: '/achievements', label: 'Trophies', icon: Trophy },
  { href: '/leaderboard', label: 'Ranks', icon: Crown },
  { href: '/analytics', label: 'Stats', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileNavigation() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-dark)]/95 backdrop-blur-lg z-50 lg:hidden border-t border-[var(--color-border)]" aria-label="Main navigation">
        <div className="flex justify-around items-center px-1 py-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-[var(--color-purple)]'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[var(--color-purple)]/20' 
                    : ''
                }`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            aria-expanded={showMore}
            aria-label="More navigation options"
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 ${
              showMore
                ? 'text-[var(--color-purple)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              showMore 
                ? 'bg-[var(--color-purple)]/20' 
                : ''
            }`}>
              {showMore ? <X size={20} /> : <MoreHorizontal size={20} />}
            </div>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More menu overlay */}
      {showMore && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMore(false)}
        >
          <div 
            className="absolute bottom-20 left-2 right-2 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-2">
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
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[var(--color-purple)]/20 text-[var(--color-purple)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-dark)]'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{item.label}</span>
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
