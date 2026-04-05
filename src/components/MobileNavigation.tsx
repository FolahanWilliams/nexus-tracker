'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Target,
  Settings,
  X,
  MoreHorizontal,
  Repeat2,
  Timer,
  Flag,
  User,
  Library,
  HelpCircle,
  Network,
  Swords,
  Brain,
  Sunrise,
} from 'lucide-react';

const mainNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/today', label: 'Today', icon: Sunrise },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/focus', label: 'Focus', icon: Timer },
];

const secondaryNavItems = [
  { href: '/habits', label: 'Habits', icon: Repeat2 },
  { href: '/character', label: 'Character', icon: User },
  { href: '/forge', label: 'Forge', icon: Library },
  { href: '/arena', label: 'Arena', icon: Swords },
  { href: '/hits', label: 'HITS', icon: Brain },
  { href: '/progress', label: 'Progress', icon: Flag },
  { href: '/insights', label: 'Insights', icon: Network },
  { href: '/tutorial', label: 'Guide', icon: HelpCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileNavigation() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Check if current page is a secondary route (show dot indicator on More button)
  const isOnSecondaryPage = secondaryNavItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));


  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-fixed-nav)] lg:hidden safe-bottom" aria-label="Main navigation">
        <div className="bg-[var(--color-bg-dark)]/90 backdrop-blur-xl border-t border-[var(--color-border)]/50">
          <div className="flex justify-around items-center px-1 py-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] rounded-xl transition-all duration-300 ${isActive
                    ? 'text-[var(--color-purple)]'
                    : 'text-[var(--color-text-muted)] active:text-[var(--color-text-secondary)]'
                    }`}
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive
                    ? 'bg-[var(--color-purple)]/15 shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                    : ''
                    }`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </Link>
              );
            })}

            {/* More button — dot indicator when on secondary page */}
            <button
              onClick={() => setShowMore(!showMore)}
              aria-expanded={showMore}
              aria-label="More navigation options"
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] rounded-xl transition-all duration-300 ${showMore || isOnSecondaryPage
                ? 'text-[var(--color-purple)]'
                : 'text-[var(--color-text-muted)]'
                }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${showMore
                ? 'bg-[var(--color-purple)]/15 shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                : ''
                }`}>
                {showMore ? <X size={20} strokeWidth={2.5} /> : <MoreHorizontal size={20} />}
              </div>
              <span className={`text-[10px] ${showMore || isOnSecondaryPage ? 'font-bold' : 'font-medium'}`}>More</span>
              {/* Active dot indicator */}
              {isOnSecondaryPage && !showMore && (
                <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[var(--color-purple)]" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* More menu overlay */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[calc(var(--z-fixed-nav)-1)] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMore(false)}
          >
            <motion.div
              className="absolute bottom-20 left-3 right-3 bg-[var(--color-bg-card)]/95 backdrop-blur-xl rounded-2xl border border-[var(--color-border)]/50 p-3 shadow-2xl safe-bottom"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-3 gap-1.5">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex flex-col items-center justify-center gap-1.5 min-h-[56px] p-3 rounded-xl transition-all duration-200 ${isActive
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
