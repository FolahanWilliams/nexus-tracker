'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Target, 
  ShoppingBag, 
  BarChart3, 
  Trophy 
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/quests', label: 'Quests', icon: Target },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/analytics', label: 'Stats', icon: BarChart3 },
  { href: '/achievements', label: 'Trophies', icon: Trophy },
];

export default function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass z-50 lg:hidden border-t border-white/10">
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-indigo-400' 
                  : 'text-white/40'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all ${
                isActive 
                  ? 'bg-indigo-500/20' 
                  : ''
              }`}>
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
