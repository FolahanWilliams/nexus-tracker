'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronDown, ChevronUp,
  LayoutDashboard, Target, Repeat2, Timer, Flag, BookOpen, Library,
  Map, Sword, User, Sparkles, BarChart3, Settings,
  Brain, Zap, Trophy,
  HelpCircle, ArrowRight, MessageCircle,
} from 'lucide-react';

// ── Tutorial Section Data ──────────────────────────────────────────

interface TutorialSection {
  id: string;
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  quickNav: string;
  content: TutorialItem[];
}

interface TutorialItem {
  heading: string;
  body: string;
  tips?: string[];
}

const SECTIONS: TutorialSection[] = [
  {
    id: 'overview',
    title: 'Dashboard Overview',
    icon: LayoutDashboard,
    color: 'var(--color-blue)',
    quickNav: '/',
    content: [
      {
        heading: 'Your Home Base',
        body: 'The Dashboard is your central hub. It shows your level, XP progress, gold, gems, streak, and a real-time productivity score calculated from your daily activity across quests, habits, and vocabulary.',
        tips: [
          'The Productivity Score (0-100) updates live as you complete tasks, habits, and vocab reviews.',
          'Daily Login Rewards grant increasing gold and gems for 7 consecutive days.',
          'The "Next Best Action" widget suggests what to do next based on your current state.',
        ],
      },
      {
        heading: 'Nexus Pulse & AI Insights',
        body: 'The Nexus Pulse card shows AI-generated cross-domain intelligence. It analyzes patterns across your tasks, habits, goals, and vocab to surface insights like "Your study sessions are most productive in the morning" or "You haven\'t reviewed vocab in 3 days."',
        tips: [
          'Pulse insights appear on most pages, tailored to that page\'s domain.',
          'The Weekly Planner on the dashboard helps you plan your week with drag-and-drop scheduling.',
        ],
      },
      {
        heading: 'Hoot - Your AI Companion',
        body: 'The floating bird icon in the bottom-right corner is Hoot, your AI companion. Tap it to open a chat where you can ask questions, get study tips, generate vocab words, reschedule reviews, set weekly plans, and more. Hoot remembers your preferences across sessions.',
        tips: [
          'Hoot can generate vocab words, start boss battles, reschedule vocab reviews, and save memory notes.',
          'Quick reply chips appear based on context — use them for fast actions.',
          'Hoot uses Google Search grounding for up-to-date study tips and information.',
        ],
      },
    ],
  },
  {
    id: 'quests',
    title: 'Quests (Tasks)',
    icon: Target,
    color: 'var(--color-green)',
    quickNav: '/quests',
    content: [
      {
        heading: 'Creating Quests',
        body: 'Quests are your to-do items. Add them manually with a title, category (Study, Health, Creative, Work, Social, Personal), difficulty (Easy, Medium, Hard, Epic), and optional duration estimate. Each quest rewards XP and Gold based on its difficulty.',
        tips: [
          'Easy = 15 XP, Medium = 25 XP, Hard = 40 XP, Epic = 60 XP (base values before multipliers).',
          'Set a category to help the AI Pulse system track your productivity patterns.',
          'Use the duration estimate to help plan your day accurately.',
        ],
      },
      {
        heading: 'AI Quest Generator',
        body: 'Click the AI sparkle button to have Gemini generate personalized quests based on your character class, level, and current goals. You can provide a prompt like "study for math exam" and it will create structured quests.',
        tips: [
          'Generated quests come with suggested difficulty levels and XP rewards.',
          'You can edit any generated quest before adding it.',
        ],
      },
      {
        heading: 'Completing & Rewards',
        body: 'Tap the checkbox to complete a quest. You earn XP, Gold, and sometimes item drops. Completing quests also contributes to Daily Quests, achievement progress, and your streak.',
        tips: [
          'Item drops are random — you might find crafting materials like herbs, scales, or gems.',
          'Critical hits (from the Lucky Star skill) can double your XP reward.',
          'Completed quests can be deleted, and deletions can be undone with the undo toast.',
        ],
      },
    ],
  },
  {
    id: 'habits',
    title: 'Habits',
    icon: Repeat2,
    color: 'var(--color-orange)',
    quickNav: '/habits',
    content: [
      {
        heading: 'Building Daily Habits',
        body: 'Create recurring habits you want to maintain. Each habit tracks a per-habit streak showing how many consecutive days you\'ve completed it. Habits reset daily at midnight.',
        tips: [
          'Choose from 15 emoji icons to personalize each habit.',
          'Assign categories to habits for cross-domain analytics.',
          'Completing habits earns 10 XP each.',
        ],
      },
      {
        heading: 'Streaks & Heatmap',
        body: 'Each habit has its own streak counter. The habit page shows a 30-day completion heatmap so you can visualize your consistency. Streak milestones at 3, 7, 14, 30, and 100 days earn bonus rewards.',
        tips: [
          'Missing a day resets that habit\'s streak to zero.',
          'The "Habit Hero" achievement requires completing any habit for 7 consecutive days.',
        ],
      },
    ],
  },
  {
    id: 'focus',
    title: 'Focus Timer',
    icon: Timer,
    color: 'var(--color-purple)',
    quickNav: '/focus',
    content: [
      {
        heading: 'Pomodoro Timer',
        body: 'A built-in Pomodoro timer with three modes: Focus (25 min), Short Break (5 min), and Long Break (15 min). After every 4 focus sessions, you get a long break automatically.',
        tips: [
          'Each completed focus session earns 30 XP and 10 Gold.',
          'Link a focus session to a specific quest to track time spent on tasks.',
          'Your total focus sessions and minutes are tracked in your stats.',
        ],
      },
      {
        heading: 'Task Linking',
        body: 'Before starting a focus session, you can link it to an incomplete quest. This helps you track which tasks you\'re spending time on and builds mindful work habits.',
      },
    ],
  },
  {
    id: 'goals',
    title: 'Goals',
    icon: Flag,
    color: 'var(--color-yellow)',
    quickNav: '/goals',
    content: [
      {
        heading: 'Setting Goals',
        body: 'Goals are longer-term objectives with milestones. Set a timeframe (1 week, 1 month, 3 months, 1 year, or lifetime), category, target date, and break it down into milestones.',
        tips: [
          'Each milestone can be checked off independently to track progress.',
          'Completing all milestones and the goal itself awards significant XP based on timeframe.',
          'Goals can have manual progress tracking (0-100%) if you prefer that to milestones.',
        ],
      },
      {
        heading: 'Goal Categories & Tracking',
        body: 'Goals use the same categories as quests (Study, Health, Creative, etc.), which feeds into the Nexus Pulse cross-domain intelligence. The goals page shows days remaining and progress visually.',
      },
    ],
  },
  {
    id: 'reflection',
    title: 'Daily Check-In',
    icon: BookOpen,
    color: 'var(--color-blue)',
    quickNav: '/reflection',
    content: [
      {
        heading: 'Morning Intention',
        body: 'Start your day by setting an intention and rating your energy level (1-5 scale from Exhausted to Legendary). This earns 10 XP and helps the AI understand your daily capacity.',
        tips: [
          'Your energy rating influences the "Next Best Action" suggestions.',
          'Setting a daily intention helps you stay focused on what matters most.',
        ],
      },
      {
        heading: 'Evening Reflection',
        body: 'End your day by writing a reflection note and rating your day with stars (1-5). This earns 10 XP and is used by the AI to build coaching insights. Reflection notes appear in your activity timeline.',
        tips: [
          'The "Self Reflector" achievement requires 7 evening reflections.',
          'Hoot can reference your reflections to provide personalized coaching advice.',
        ],
      },
    ],
  },
  {
    id: 'wordforge',
    title: 'WordForge (Vocabulary)',
    icon: Library,
    color: 'var(--color-purple)',
    quickNav: '/wordforge',
    content: [
      {
        heading: 'Daily Words',
        body: 'Generate 5 new vocabulary words daily using AI. Words come with definitions, pronunciation, etymology, example sentences, related words, antonyms, and AI-generated mnemonics. Your difficulty level (Beginner, Intermediate, Advanced, Expert) auto-adjusts based on your performance.',
        tips: [
          'Generating daily words earns XP.',
          'You can create your own mnemonics for any word — self-created aids stick better!',
          'The AI mnemonic is hidden by default to encourage you to think of your own first.',
        ],
      },
      {
        heading: 'Review & Adaptive Quiz',
        body: 'Words due for review are scheduled using the SM-2 spaced repetition algorithm. The Adaptive Quiz selects question types based on each word\'s learning status:',
        tips: [
          'New words get simple Multiple Choice questions.',
          'Learning words get a mix of Reverse Choice and Fill in the Blank.',
          'Reviewing words get harder types like Use in Sentence, Synonym/Antonym Match, Etymology Drill.',
          'Mastered words get the hardest: Contextual Cloze, Spelling Challenge, Use in Sentence.',
          'Words you fail repeatedly get easier question types to rebuild confidence.',
        ],
      },
      {
        heading: 'Interactive Study Cards',
        body: 'Before every quiz, you study your words with interactive flashcards. Instead of passively reading, you\'re prompted to recall the definition from memory first. After revealing the answer, you can create a mnemonic and rate your confidence (1-5).',
        tips: [
          'Your confidence rating feeds into the SM-2 algorithm — low confidence + correct answer is treated as a guess.',
          'Response time is tracked — fast correct answers boost your scheduling quality, slow ones reduce it.',
          'Sessions mix ~70% due words with ~30% mastered words for interleaving benefits.',
        ],
      },
      {
        heading: 'Free Recall Mode',
        body: 'For deeper learning, use Free Recall — type the definition from memory, then self-grade as Forgot, Partially, or Perfect. This mode gives you full control over quality assessment.',
      },
      {
        heading: 'Collection & Progress',
        body: 'The Collection tab lets you browse all your words with search, filter by status (New, Learning, Reviewing, Mastered), and filter by category. The Progress tab shows your mastery stats, accuracy trends, and streak.',
        tips: [
          'Mastering words contributes to boss battle damage bonuses.',
          'Every 5 mastered words adds +2% bonus damage (up to +20%).',
        ],
      },
    ],
  },
  {
    id: 'chains',
    title: 'Quest Chains',
    icon: Map,
    color: 'var(--color-green)',
    quickNav: '/chains',
    content: [
      {
        heading: 'Multi-Step Quests',
        body: 'Quest Chains are multi-step storyline quests. Each chain has ordered steps that unlock sequentially. Some steps have branching paths where you choose between options, each with different XP bonuses.',
        tips: [
          'Create your own chains or use the AI generator to create them from a prompt.',
          'Completing all steps in a chain awards a special completion bonus.',
          'Branching paths add variety — choose the option that fits your playstyle.',
        ],
      },
    ],
  },
  {
    id: 'bosses',
    title: 'Boss Battles',
    icon: Sword,
    color: 'var(--color-red)',
    quickNav: '/bosses',
    content: [
      {
        heading: 'Fighting Bosses',
        body: 'Boss Battles are timed encounters against themed enemies like the Procrastination Demon, Distraction Dragon, or Chaos Phoenix. Each boss has HP, a time limit, and difficulty-scaled rewards.',
        tips: [
          'Easy bosses: 5-30 damage per attack. Epic bosses: 15-80 damage per attack.',
          'Attack damage is random within the range — keep clicking to deal damage before time runs out!',
          'Defeating bosses earns massive XP (150-750) and Gold (75-500).',
        ],
      },
      {
        heading: 'Vocab Mastery Bonus',
        body: 'Your mastered vocabulary words give you a permanent damage bonus in boss battles. Every 5 mastered words adds +2% bonus damage, up to a maximum of +20% at 50 mastered words.',
      },
    ],
  },
  {
    id: 'character',
    title: 'Character & Classes',
    icon: User,
    color: 'var(--color-purple)',
    quickNav: '/character',
    content: [
      {
        heading: 'Your Character Profile',
        body: 'Customize your character with a name, age, year level, motto, and strengths. Your character earns titles as you level up, from "Novice" at Level 1 to legendary titles at high levels.',
      },
      {
        heading: 'Character Classes',
        body: 'Choose from 5 classes, each with unique passive bonuses:',
        tips: [
          'Scholar — +15% XP from Study quests, +5% all XP',
          'Strategist — +10% XP from all categories, bonus Gold',
          'Warrior — +20% XP from Hard/Epic quests, +10% boss damage',
          'Merchant — +25% Gold from all sources, shop discounts',
          'Creator — +15% XP from Creative quests, +10% crafting bonus',
        ],
      },
      {
        heading: 'Respeccing Classes',
        body: 'You can switch classes at any time for a Gold cost. This lets you adapt your build to your current focus — switch to Scholar during exam season, Warrior when you need motivation for tough tasks.',
      },
      {
        heading: 'Skill Tree',
        body: 'Spend XP to unlock and upgrade passive skills in four categories: Productivity, Combat, Magic, and Crafting. Skills provide permanent multipliers to XP, Gold, damage, and more. You can reset individual skills for a 70% XP refund.',
        tips: [
          'The "Lucky Star" skill gives a chance for Critical Hits that double quest XP.',
          'Skills have multiple ranks — each upgrade strengthens the bonus.',
          'Plan your skill investments based on what activities you do most.',
        ],
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Items, Crafting & Shop',
    icon: Sparkles,
    color: 'var(--color-yellow)',
    quickNav: '/inventory',
    content: [
      {
        heading: 'Inventory',
        body: 'Items drop randomly when you complete quests. Items range from Common to Legendary rarity and include weapons, shields, rings, potions, scrolls, and crystals. Equip items to gain stat bonuses.',
        tips: [
          'Equipped items provide passive bonuses like +XP%, +Gold%, +damage.',
          'Rarer items have stronger bonuses.',
          'You can only equip one item of each type at a time.',
        ],
      },
      {
        heading: 'Crafting',
        body: 'Collect crafting materials (herbs, scales, gems, etc.) from quest completions and use recipes to forge new items. Crafting recipes show required materials and the resulting item with its stats.',
        tips: [
          'The "Craftsman" achievement unlocks when you craft your first item.',
          'Higher-tier recipes require rarer materials from harder quests.',
        ],
      },
      {
        heading: 'Rewards Shop',
        body: 'Spend your Gold on real-world rewards you define yourself! Create custom rewards like "Watch a movie", "Buy a snack", or "Take an afternoon off." Set a Gold price for each reward to make the grind feel real.',
        tips: [
          'Use Gems to activate temporary XP boost buffs.',
          'Merchant class gives shop discounts — great for frequent shoppers.',
          'You can create, edit, and delete custom rewards at any time.',
        ],
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Progress & Records',
    icon: BarChart3,
    color: 'var(--color-blue)',
    quickNav: '/analytics',
    content: [
      {
        heading: 'Stats Dashboard',
        body: 'The Stats tab shows your all-time statistics: total quests completed, XP earned, Gold earned, focus sessions, focus minutes, current level, streak, and more. A contribution heatmap visualizes your daily activity over time.',
      },
      {
        heading: 'Achievements',
        body: 'Track your progress toward 20+ achievements across four rarity tiers:',
        tips: [
          'Common: First Blood (complete 1 quest), Habit Builder (create 5 habits)',
          'Rare: High Roller (Level 5), Quest Master (10 quests), Week Warrior (7-day streak), Wordsmith (master 10 words)',
          'Epic: Boss Slayer, Habit Hero (7-day habit streak), Scholar Elite (25 Study quests)',
          'Legendary: Centurion (100 quests), Streak Legend (30-day streak), Veteran (Level 20), Lexicon Lord (50 mastered words)',
        ],
      },
      {
        heading: 'Timeline',
        body: 'A chronological activity feed showing all your accomplishments, level-ups, achievements unlocked, boss defeats, and reflections. Great for looking back at your progress journey.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Data',
    icon: Settings,
    color: 'var(--color-text-secondary)',
    quickNav: '/settings',
    content: [
      {
        heading: 'Audio & Theme',
        body: 'Toggle sound effects and background music with independent volume controls. Switch between dark and light themes.',
      },
      {
        heading: 'Data Management',
        body: 'Export your entire save data as a JSON backup file, or import from a previous backup. This is crucial for preserving your progress.',
        tips: [
          'Export regularly to avoid losing progress.',
          'The reset button permanently deletes all data — use with extreme caution.',
        ],
      },
    ],
  },
  {
    id: 'tips',
    title: 'Pro Tips & Strategies',
    icon: Zap,
    color: 'var(--color-orange)',
    quickNav: '',
    content: [
      {
        heading: 'Maximize XP Gains',
        body: 'Stack bonuses for maximum XP: choose the right class for your activities, upgrade XP-boosting skills, equip high-rarity items, and use Gem-purchased XP boosts. The Scholar class with XP skills can earn 20%+ more XP on Study quests.',
      },
      {
        heading: 'Maintain Your Streak',
        body: 'Your daily streak is one of the most powerful progression tools. It contributes to your productivity score, unlocks achievements, and increases daily login rewards. Complete at least one quest or habit each day to keep it alive.',
      },
      {
        heading: 'Use All Systems Together',
        body: 'QuestFlow is designed so that every system feeds into others. Vocab mastery boosts boss damage. Boss victories earn Gold for the shop. Quests drop crafting materials. Skills multiply all rewards. The more systems you engage with, the faster you progress.',
      },
      {
        heading: 'Daily Routine for Maximum Progress',
        body: 'For the best results, follow this daily flow:',
        tips: [
          '1. Morning: Set your daily intention in Check-In.',
          '2. Generate daily vocab words in WordForge.',
          '3. Complete your priority quests using Focus Timer sessions.',
          '4. Check off your daily habits.',
          '5. Review due vocabulary words (adaptive quiz or free recall).',
          '6. Evening: Write your reflection and rate your day.',
          '7. Claim your daily login reward on the dashboard.',
        ],
      },
      {
        heading: 'Keyboard & Navigation Tips',
        body: 'Use the sidebar (desktop) or bottom navigation (mobile) to quickly switch between sections. The "More" menu on mobile reveals all secondary pages. Hoot is available on every page via the floating button.',
      },
    ],
  },
];

// ── Collapsible Section Component ──────────────────────────────────

function TutorialSectionCard({ section, isOpen, onToggle }: {
  section: TutorialSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${section.color}20` }}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">{section.title}</h3>
          <p className="text-[10px] text-[var(--color-text-secondary)]">
            {section.content.length} topic{section.content.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {section.quickNav && (
            <Link
              href={section.quickNav}
              onClick={e => e.stopPropagation()}
              className="text-[10px] font-bold px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-hover)] transition-colors flex items-center gap-1"
            >
              Go <ArrowRight size={10} />
            </Link>
          )}
          {isOpen ? (
            <ChevronUp size={18} className="text-[var(--color-text-secondary)]" />
          ) : (
            <ChevronDown size={18} className="text-[var(--color-text-secondary)]" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-border)] pt-4">
              {section.content.map((item, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="text-sm font-bold" style={{ color: section.color }}>
                    {item.heading}
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {item.body}
                  </p>
                  {item.tips && (
                    <ul className="space-y-1.5 pl-1">
                      {item.tips.map((tip, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                          <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full" style={{ background: section.color }} />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {i < section.content.length - 1 && (
                    <div className="border-b border-[var(--color-border)] mt-3" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function TutorialPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['overview']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(SECTIONS.map(s => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  // Filter sections by search query
  const filteredSections = searchQuery.trim()
    ? SECTIONS.filter(section => {
        const q = searchQuery.toLowerCase();
        if (section.title.toLowerCase().includes(q)) return true;
        return section.content.some(item =>
          item.heading.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q) ||
          item.tips?.some(tip => tip.toLowerCase().includes(q))
        );
      })
    : SECTIONS;

  return (
    <motion.div
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <HelpCircle size={20} className="text-[var(--color-purple)]" />
              Guide & Tutorial
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Everything you need to master QuestFlow
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Intro */}
        <motion.div
          className="p-4 rounded-lg border-l-4 border-[var(--color-purple)] bg-[var(--color-bg-card)]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            <span className="font-bold text-[var(--color-purple)]">Welcome to QuestFlow</span> — your AI-powered productivity RPG.
            This guide covers every feature in the app. Tap any section to expand it, or use the search bar to find specific topics.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Target, label: 'Features', value: `${SECTIONS.length} sections`, color: 'var(--color-green)' },
            { icon: Brain, label: 'AI Powered', value: 'Gemini AI', color: 'var(--color-purple)' },
            { icon: Trophy, label: 'Achievements', value: '20+ to unlock', color: 'var(--color-yellow)' },
          ].map((stat, i) => {
            const StatIcon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center"
              >
                <StatIcon size={18} style={{ color: stat.color }} className="mx-auto mb-1" />
                <p className="text-xs font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Search + Controls */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              className="w-full pl-3 pr-8 py-2 rounded-lg text-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] text-white focus:outline-none focus:border-[var(--color-purple)] placeholder:text-[var(--color-text-muted)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
          <button
            onClick={expandAll}
            className="text-[10px] font-bold text-[var(--color-text-secondary)] hover:text-white transition-colors px-2 py-2 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-[10px] font-bold text-[var(--color-text-secondary)] hover:text-white transition-colors px-2 py-2 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
          >
            Collapse All
          </button>
        </div>

        {/* Search results count */}
        {searchQuery.trim() && (
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {filteredSections.length} of {SECTIONS.length} sections match &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        {/* Sections */}
        <div className="space-y-3">
          {filteredSections.map((section) => (
            <TutorialSectionCard
              key={section.id}
              section={section}
              isOpen={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            <HelpCircle size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No topics match your search.</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-center space-y-2">
          <MessageCircle size={20} className="mx-auto text-[var(--color-purple)]" />
          <p className="text-xs text-[var(--color-text-secondary)]">
            Still have questions? Ask <span className="font-bold text-[var(--color-purple)]">Hoot</span> — your AI companion (bottom-right corner) — for personalized help anytime.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
