'use client';

import { motion } from 'framer-motion';

export interface TabDef {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface TabShellProps {
    tabs: TabDef[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

export default function TabShell({ tabs, activeTab, onTabChange }: TabShellProps) {
    return (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-lg transition-colors ${
                            isActive
                                ? 'text-white bg-[var(--color-bg-card)] border border-b-0 border-[var(--color-border)]'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-dark)]'
                        }`}
                        aria-selected={isActive}
                        role="tab"
                    >
                        {isActive && (
                            <motion.div
                                layoutId="tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-purple)]"
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            />
                        )}
                        {tab.icon}
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
