# QuestFlow — AI-Powered Productivity RPG

**Turn every task into an adventure. Build real habits through gamification, AI coaching, and cognitive training.**

QuestFlow is a full-stack productivity platform that applies behavioral psychology, gamification mechanics, and generative AI to solve the hardest problem in personal productivity: sustained engagement. By transforming mundane tasks into an RPG experience — complete with character progression, boss battles, skill trees, and an AI coach — QuestFlow keeps users motivated long after traditional todo apps lose their appeal.

> Built with Next.js 16, React 19, Supabase, Google Gemini AI, and Stripe. PWA-enabled for offline-first mobile use.

---

## Why QuestFlow

Most productivity tools fail because they treat motivation as the user's problem. QuestFlow treats it as a **design problem** — and solves it with three reinforcement loops:

1. **Immediate Reward** — Every action (completing a task, finishing a focus session, reviewing vocabulary) awards XP, gold, and loot drops with visible, satisfying feedback.
2. **Progressive Mastery** — Character classes, skill trees, titles, and equipment create a long-term growth arc that mirrors real skill development.
3. **Intelligent Adaptation** — Gemini-powered AI continuously analyzes user patterns across all domains, detects burnout risk, and proactively adjusts recommendations.

The result: users don't just track tasks — they build a character that reflects their real-world growth.

---

## Platform Overview

### AI Intelligence Layer (Nexus Pulse)

A cross-domain analytics engine powered by Google Gemini that synthesizes data from every system in the app:

- **Burnout Detection** — Monitors energy ratings, task completion velocity, streak breaks, and reflection sentiment to calculate a real-time burnout risk score (0–1 scale)
- **Momentum Tracking** — Classifies user trajectory as Rising, Steady, or Declining with week-over-week trend analysis
- **Contextual Recommendations** — Generates route-specific actionable insights (e.g., different advice on the Quests page vs. the Habits page)
- **Event-Driven Refresh** — Automatically triggers re-analysis after batch quest completions, boss battles, streak breaks, vocab quizzes, and reflection submissions
- **Historical Snapshots** — Stores daily data points for longitudinal trend analysis

### Hoot AI Coach

A conversational AI companion with Gemini function calling that can take real actions in the app:

- **12 executable actions** — Create tasks, complete habits, set goals with milestones, initiate boss battles, generate vocabulary, create weekly plans, and more
- **Persistent Memory** — Stores notes about user preferences, goals, and behavioral patterns across sessions
- **Google Search Grounding** — Can search the web in real time to provide current, factual responses
- **Player Narrative** — Builds a personalized story based on the user's class, progress, and patterns
- **Context-Aware Quick Replies** — Suggests relevant follow-up actions based on conversation state

### Gamification Engine

A unified reward system with stacked multipliers and deep RPG mechanics:

- **5 Character Classes** — Scholar (+20% XP), Strategist (+10% XP/Gold, +15% boss damage), Warrior (+30% boss damage), Merchant (+25% Gold), Creator (+15% XP/Gold, +10% item drops)
- **Skill Tree** — Unlockable skills across productivity, combat, magic, and crafting categories with progressive upgrade costs
- **Equipment System** — Weapons, armor, accessories, and consumables with rarity tiers (Common → Legendary) and stat bonuses
- **Crafting** — Combine materials from quest drops into higher-tier items
- **Boss Battles** — Fight procedurally generated bosses (Procrastination Demon, Distraction Dragon, etc.) with damage scaled by difficulty and vocabulary mastery
- **Quest Chains** — Multi-step quest sequences with branching paths and chain-completion rewards
- **Title Progression** — Novice → Apprentice → Journeyman → Expert → Master → Grandmaster → Legend, based on level, quests completed, and streaks maintained
- **Lucky Star Proc** — Random chance to double any reward, adding excitement to every action
- **7-Day Login Rewards** — Escalating daily Gold and Gem bonuses for consistent engagement

### Vocabulary & Cognitive Training

Two integrated learning systems that cross-pollinate with the RPG layer:

**WordForge (Spaced Repetition)**
- Production-grade **SM-2 algorithm** with ease factors (1.3–3.0), intervals up to 365 days, and 21-day mastery threshold
- AI-generated daily words adapted to learner level (beginner → expert) with automatic promotion/demotion based on accuracy
- Vocabulary mastery directly boosts boss battle damage (+5% per 5 mastered words, up to +50%)
- Quiz-based review with quality scoring, XP/Gold rewards, and streak tracking

**MindForge (Cognitive Training)**
- **Argument Builder** — Structured debate exercises evaluated on clarity, logic, evidence, and rebuttal quality
- **Analogy Engine** — Abstract thinking training through concept-pair analogies
- **Summary Challenge** — Passage compression exercises graded on accuracy and conciseness
- **Impromptu Speaking** — Speech practice with AI transcript analysis for coherence, pacing, and vocabulary usage

### Habit Tracking & Reflection

- **Daily Habit System** — Streaks with milestone rewards at 3, 7, 14, 30, and 100 days
- **Contribution Heatmap** — 30-day visual completion calendar per habit
- **Morning Intentions** — Set daily focus with energy rating (1–5)
- **Evening Reflections** — Submit reflections with star ratings; XP scales with rating and tasks completed
- **Energy Monitoring** — Daily energy ratings feed into Nexus Pulse burnout detection

### Focus Timer

- **Pomodoro System** — 25-min focus / 5-min break cycles with automatic long breaks after 4 sessions
- **Session Rewards** — +30 XP and +10 Gold per completed focus session
- **Task Linking** — Optionally tie focus sessions to specific quests for attribution
- **Audio Feedback** — Sound effects on timer completion

### Analytics & Achievements

- **Real-Time Productivity Score** (0–100) — Composite of daily task completion (40 pts), habit rate (30 pts), and streak bonus (30 pts)
- **20+ Achievements** — Across quest, habit, streak, level, and vocabulary categories with rarity tiers (Common, Rare, Epic, Legendary)
- **Smart Achievements** — AI detects noteworthy session patterns and grants dynamic achievements
- **Activity Timeline** — Visual event log with category-coded colors, date filtering, and image export
- **Comprehensive Stats** — Total quests, gold earned, XP earned, focus minutes, streaks, and category breakdowns

---

## Technical Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Framer Motion |
| **State** | Zustand with 7 composable slices + IndexedDB persistence |
| **Database** | Supabase (PostgreSQL) with Row-Level Security, JSONB columns, triggers |
| **AI/ML** | Google Gemini 3 Flash with function calling + Google Search grounding |
| **Auth** | Supabase Auth (Google OAuth) with auto-profile creation triggers |
| **Payments** | Stripe subscriptions with 3-day free trial, customer portal, webhooks |
| **PWA** | next-pwa with service worker caching for offline-first mobile experience |
| **Charts** | Recharts for analytics dashboards |

### 18 API Endpoints

Serverless API routes powering AI features, payments, and game logic:

- AI quest generation with web search grounding
- Natural language command parsing for task creation
- Auto-tagging (category, difficulty, XP estimation)
- Boss and quest chain generation from user prompts
- Vocabulary generation, quizzing, and sentence grading (SM-2)
- Cognitive training evaluation (argument, analogy, summary, speech)
- Cross-domain AI synthesis (Nexus Pulse)
- Hoot AI function calling and web search
- Smart achievement detection
- Strategic weekly plan generation
- Stripe checkout, portal, and webhook handling

### Hybrid Persistence

- **Offline** — IndexedDB stores full game state locally for instant load and offline use
- **Cloud** — Supabase syncs all data with RLS policies isolating each user
- **Automatic Sync** — State changes propagate to Supabase in real time when online

---

## Pages

| Route | Description |
|-------|-------------|
| `/overview` | Dashboard with productivity score, widgets, daily rewards, Nexus Pulse insights |
| `/quests` | Task management with AI generation, NLP commands, auto-tagging |
| `/habits` | Habit tracking with streaks, milestones, and contribution heatmaps |
| `/goals` | Long-term goal setting with milestones and timeframes |
| `/reflection` | Morning intentions and evening reflections with energy tracking |
| `/focus` | Pomodoro timer with session tracking and task linking |
| `/bosses` | Boss battle system with dynamic HP and vocab mastery bonuses |
| `/chains` | Multi-step quest chains with branching paths |
| `/character` | Profile, class selection, skill tree, titles |
| `/inventory` | Equipment, consumables, crafting, loot management |
| `/wordforge` | Spaced repetition vocabulary with AI-generated words and quizzes |
| `/mindforge` | Cognitive training: argument, analogy, summary, speaking exercises |
| `/analytics` | Stats, achievements, timeline, heatmap |
| `/settings` | Sound, theme, data export/import, account reset |
| `/pricing` | Subscription plans with Stripe checkout |
| `/tutorial` | Interactive onboarding guide |

---

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Configure: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#            GOOGLE_API_KEY, STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY, STRIPE_PRICE_ID

# Run development server
npm run dev

# Build for production
npm run build && npm start
```

---

## License

MIT
