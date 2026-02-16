'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Target, ShoppingBag, BarChart2, Trophy, Sword, Map, Sparkles, Settings } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/bosses', label: 'Boss', icon: Sword },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/inventory', label: 'Items', icon: Sparkles },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[var(--border-color)] z-50 lg:hidden">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <div className={`p-2 rounded-xl transition-all ${
                isActive ? 'bg-[var(--duo-green)] text-white' : ''
              }`}>
                <Icon size={24} />
              </div>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
