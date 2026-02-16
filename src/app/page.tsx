
'use client';

import { useGameStore } from '@/store/useGameStore';
import Link from 'next/link';
import {
  Target,
  ShoppingBag,
  Trophy,
  Zap,
  TrendingUp,
  Activity,
  BarChart3,
  MoreHorizontal
} from 'lucide-react';
import Ticker from '@/components/Ticker';

export default function DashboardPage() {
  const { xp, level, gold, streak, tasks } = useGameStore();

  const recentTasks = tasks.slice(-5).reverse();

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans">
      {/* Scrollable Ticker */}
      <Ticker />

      {/* Main Content Area */}
      <div className="p-6 space-y-6">

        {/* Header Section */}
        <div className="flex items-end justify-between border-b border-[var(--border)] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="status-dot status-live"></div>
              <span className="text-xs font-mono text-[var(--text-secondary)] tracking-wider">SYSTEM STATUS: OPTIMAL</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)] mb-1">CURRENT SESSION</p>
            <p className="text-xl font-mono text-[var(--text-primary)]">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* Main Hero Card - Focus Status */}
          <div className="col-span-12 lg:col-span-8 k-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="text-sm text-[var(--text-secondary)] uppercase mb-4 font-mono">Focus Environment</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">PRODUCTIVITY RATE</p>
                  <p className="text-4xl font-mono font-bold text-[var(--accent-green)]">94.2<span className="text-lg">%</span></p>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1">
                    <TrendingUp size={12} className="text-[var(--accent-green)]" />
                    +2.4% vs last session
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">ACTIVE STREAK</p>
                  <p className="text-4xl font-mono font-bold text-[var(--accent-blue)]">{streak}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">Days Consecutive</p>
                </div>
              </div>
            </div>
          </div>

          {/* Side Stats Panel */}
          <div className="col-span-12 lg:col-span-4 grid grid-rows-2 gap-6">
            <div className="k-card p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase mb-1">Gold Balance</p>
                  <p className="text-2xl font-mono font-bold text-[var(--accent-yellow)]">{gold}</p>
                </div>
                <Zap size={16} className="text-[var(--accent-yellow)] opacity-50" />
              </div>
              <div className="w-full bg-[var(--bg-app)] h-1 mt-4 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent-yellow)] w-[75%]"></div>
              </div>
            </div>

            <div className="k-card p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase mb-1">XP Accumulation</p>
                  <p className="text-2xl font-mono font-bold text-[var(--accent-blue)]">{xp}</p>
                </div>
                <Trophy size={16} className="text-[var(--accent-blue)] opacity-50" />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Level {level} Clearance</p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/quests" className="k-card k-card-interactive p-4 flex items-center gap-4 group">
              <div className="w-10 h-10 rounded bg-[var(--bg-app)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--accent-green)] transition-colors">
                <Target size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-green)]" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Initiate Operation</h4>
                <p className="text-xs text-[var(--text-secondary)]">Manage active quests</p>
              </div>
            </Link>

            <Link href="/shop" className="k-card k-card-interactive p-4 flex items-center gap-4 group">
              <div className="w-10 h-10 rounded bg-[var(--bg-app)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--accent-yellow)] transition-colors">
                <ShoppingBag size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-yellow)]" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Reward Shop</h4>
                <p className="text-xs text-[var(--text-secondary)]">Spend gold on rewards</p>
              </div>
            </Link>

            <Link href="/analytics" className="k-card k-card-interactive p-4 flex items-center gap-4 group">
              <div className="w-10 h-10 rounded bg-[var(--bg-app)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--accent-blue)] transition-colors">
                <BarChart3 size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-blue)]" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Data Analysis</h4>
                <p className="text-xs text-[var(--text-secondary)]">View performance metrics</p>
              </div>
            </Link>
          </div>

          {/* Active Operations List */}
          <div className="col-span-12 lg:col-span-8 k-card">
            <div className="k-card-header">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Active Quest Log</h3>
              <button className="text-[var(--text-muted)] hover:text-white transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="k-card-body p-0">
              {recentTasks.length > 0 ? (
                <div className="divide-y divide-[var(--border)]">
                  {recentTasks.map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${task.completed ? 'bg-[var(--text-muted)]' : 'bg-[var(--accent-green)] shadow-[0_0_8px_rgba(0,220,130,0.4)]'}`}></div>
                        <div>
                          <p className={`text-sm font-medium ${task.completed ? 'text-[var(--text-muted)] line-through' : 'text-white'}`}>{task.title}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">{`${task.difficulty.toUpperCase()} // +${task.xpReward} XP`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-2 py-1 rounded border ${task.completed
                            ? 'border-[var(--border)] text-[var(--text-muted)]'
                            : 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[rgba(0,220,130,0.05)]'
                          }`}>
                          {task.completed ? 'RESOLVED' : 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[var(--text-muted)]">
                  <p className="text-sm">No active operations found.</p>
                </div>
              )}
            </div>
          </div>

          {/* News / Updates Feed */}
          <div className="col-span-12 lg:col-span-4 k-card">
            <div className="k-card-header">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">System Logs</h3>
            </div>
            <div className="k-card-body space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    System initialization complete. Dashboard v3.0 loaded successfully.
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">10m ago</p>
                </div>
              </div>

               <div className="flex gap-3">
                 <div className="mt-1 flex-shrink-0">
                   <div className="w-2 h-2 rounded-full bg-[var(--accent-yellow)]"></div>
                 </div>
                 <div>
                   <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                     Quest generation AI online. Ready to help with new tasks.
                   </p>
                   <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">1h ago</p>
                 </div>
               </div>

              <div className="flex gap-3">
                <div className="mt-1 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]"></div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    Routine maintenance scheduled for 0300 cycle.
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">4h ago</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
