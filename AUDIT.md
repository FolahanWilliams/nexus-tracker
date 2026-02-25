# QuestFlow Nexus Tracker - Comprehensive Codebase Audit

**Date:** 2026-02-25
**Auditor:** Automated deep audit
**Commit base:** `main`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Critical Security Findings](#critical-security-findings)
4. [Code Quality Issues](#code-quality-issues)
5. [Testing & Reliability](#testing--reliability)
6. [Dependency Audit](#dependency-audit)
7. [Performance Concerns](#performance-concerns)
8. [Database & Data Layer](#database--data-layer)
9. [Configuration & Environment](#configuration--environment)
10. [Accessibility & PWA](#accessibility--pwa)
11. [Prioritized Recommendations](#prioritized-recommendations)

---

## Executive Summary

**QuestFlow** is a gamified productivity app built with Next.js 16, React 19, Zustand, Supabase, and Google Gemini AI. It features RPG mechanics (XP, levels, boss battles, inventory, crafting) layered on top of a task/habit tracker with AI-powered quest generation.

The application is functional and demonstrates creative product thinking, but the audit uncovered **significant issues** across security, architecture, testing, and code quality that should be addressed before production use with real users.

### Risk Summary

| Area | Severity | Key Finding |
|------|----------|-------------|
| **Security** | **CRITICAL** | All 13 API routes lack authentication; no rate limiting; no CSRF protection |
| **Testing** | **CRITICAL** | Zero test files exist in the entire codebase |
| **Architecture** | **HIGH** | 2,327-line monolithic store; no separation of concerns |
| **Code Quality** | **MEDIUM** | 40+ console statements; swallowed errors; type safety bypasses |
| **Dependencies** | **MEDIUM** | `moment.js` (deprecated); `@types/canvas-confetti` in production deps |
| **Performance** | **MEDIUM** | Full state blob synced to Supabase on every change; large components |

---

## Architecture Overview

### Technology Stack

- **Framework:** Next.js 16.1.6 (App Router) with Turbopack
- **UI:** React 19.2.3, Tailwind CSS 4, Framer Motion 12
- **State:** Zustand 5 with custom IndexedDB + Supabase persistence
- **Auth:** Supabase Auth (Google OAuth)
- **AI:** Google Gemini (`gemini-3-flash-preview`) for quest generation, coaching, and search
- **Database:** Supabase (PostgreSQL) with JSONB state blob
- **PWA:** next-pwa for service worker / offline support

### Directory Structure

```
src/
  app/           # 17 route groups (pages + API routes)
    api/         # 13 API route handlers
  components/    # 29 shared React components
  hooks/         # 3 custom hooks (useNexusPulse, useSoundEffects, useAmbientSound)
  lib/           # 5 utility modules (supabase, sync, indexedDB, storage, validation)
  store/         # 1 monolithic Zustand store (useGameStore.ts - 2,327 lines)
supabase/
  migrations/    # 4 SQL migration files
```

### Architecture Pattern

The app uses a **single global Zustand store** (`useGameStore`) containing all application state (tasks, habits, goals, inventory, skills, character, settings, etc.) persisted as a single JSONB blob to Supabase. This "dump entire state" approach is simple but creates several issues documented below.

---

## Critical Security Findings

### S1. API Routes Lack Authentication (CRITICAL)

**All 13 API routes** accept requests without verifying the caller's identity. Any unauthenticated client can invoke the AI endpoints, consuming the project's Gemini API quota and incurring costs.

**Affected files:**
- `src/app/api/generate-quest/route.ts`
- `src/app/api/generate-boss/route.ts`
- `src/app/api/generate-chain/route.ts`
- `src/app/api/hoot-action/route.ts`
- `src/app/api/hoot-search/route.ts`
- `src/app/api/quest-command/route.ts`
- `src/app/api/ai-coach/route.ts`
- `src/app/api/nexus-pulse/route.ts`
- `src/app/api/auto-tag/route.ts`
- `src/app/api/smart-achievements/route.ts`
- `src/app/api/weekly-plan/route.ts`
- `src/app/api/vocab/generate-quiz/route.ts`
- `src/app/api/vocab/generate-words/route.ts`

**Impact:** API cost abuse, unauthorized data access, potential quota exhaustion.

**Recommendation:** Add Supabase JWT verification middleware to all API routes:

```typescript
import { createClient } from '@supabase/supabase-js';

async function authenticateRequest(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}
```

### S2. No Rate Limiting (CRITICAL)

Zero rate limiting across all API endpoints. An attacker can send unlimited requests to the Gemini-backed routes, causing:
- Rapid API quota exhaustion
- Financial cost amplification
- Potential denial of service

**Recommendation:** Implement rate limiting using `next-rate-limit`, Vercel's built-in rate limiting, or a Redis-based solution.

### S3. No Middleware Layer (HIGH)

The project has **no `middleware.ts` file**. There is no request-level protection for:
- Authentication verification
- CSRF token validation
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting
- Request logging

### S4. No CORS Configuration (HIGH)

No CORS headers or configuration exist. While Next.js API routes are same-origin by default, the lack of explicit CORS configuration means:
- No protection against misconfigured reverse proxies
- No defense-in-depth for API routes

### S5. No Content Security Policy (HIGH)

No CSP headers are set anywhere. The app renders user-generated content (task titles, reflection notes) and AI-generated content, making XSS a real concern despite the client-side `sanitizeInput()` function in `src/lib/validation.ts`.

### S6. API Keys Initialized with Empty Strings (MEDIUM)

All API routes initialize the Gemini client with a fallback empty string:

```typescript
// src/app/api/generate-quest/route.ts:5
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
```

This means the client is always instantiated, even when no key is configured. While the routes check for the key before calling Gemini, the pattern is fragile.

### S7. Supabase Client Created with Placeholder Credentials (MEDIUM)

```typescript
// src/lib/supabase.ts:10-11
export const supabase = createBrowserClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
```

A Supabase client is created with placeholder values when credentials are missing. This silently proceeds rather than failing fast.

### S8. Sanitization Approach is Fragile (MEDIUM)

The `sanitizeInput()` function in `src/lib/validation.ts:172-178` performs manual HTML entity encoding. This is a weaker approach than using a battle-tested library like DOMPurify. The forward slash replacement (`/` -> `&#x2F;`) is unnecessary and may corrupt legitimate input (URLs, file paths).

### S9. AI Prompt Injection Surface (MEDIUM)

User input is interpolated directly into AI prompts across all Gemini API routes. For example:

```typescript
// src/app/api/generate-quest/route.ts:84
const result = await model.generateContent(`${systemPrompt}\n\nUser Goal: ${prompt}`);
```

While this doesn't create traditional security vulnerabilities (the AI output is not executed as code), it does allow prompt injection that could manipulate AI behavior to produce misleading or harmful content.

### S10. OAuth Callback URL Constructed Client-Side (LOW)

```typescript
// src/components/AuthProvider.tsx:89
redirectTo: `${window.location.origin}/auth/v1/callback`
```

Building the redirect URL from `window.location.origin` could be manipulated in certain scenarios. This should be an environment variable or a hardcoded list of allowed origins.

---

## Code Quality Issues

### Q1. Monolithic Store (HIGH)

`src/store/useGameStore.ts` is **2,327 lines** containing a single Zustand store with 100+ actions and the entire application state. This file:
- Is extremely difficult to navigate and maintain
- Creates implicit coupling between unrelated features
- Makes code review of changes nearly impossible
- Causes unnecessary re-renders (any state change triggers subscribers)

**Recommendation:** Split into domain-specific stores:
- `useCharacterStore` (character, XP, level, title, HP)
- `useQuestStore` (tasks, daily quests, quest chains)
- `useHabitStore` (habits, streaks)
- `useGoalStore` (goals, milestones)
- `useInventoryStore` (inventory, equipment, crafting)
- `useVocabStore` (vocabulary, spaced repetition)
- `useSettingsStore` (settings, preferences)

### Q2. Oversized Components (HIGH)

Several components far exceed reasonable size limits:

| File | Lines | Concern |
|------|-------|---------|
| `src/components/HootFAB.tsx` | 1,174 | AI chat + trigger engine + animations |
| `src/app/wordforge/components.tsx` | 1,108 | Entire vocabulary quiz system |
| `src/app/quests/page.tsx` | 869 | Quest management + AI generation |
| `src/app/page.tsx` | 726 | Dashboard with 12+ integrated features |

### Q3. Console Statements in Production Code (MEDIUM)

**40+ instances** of `console.log`, `console.error`, and `console.warn` scattered across the codebase. Key locations:

- `src/store/useGameStore.ts` (8 instances)
- `src/components/HootFAB.tsx` (3 instances)
- `src/app/quests/page.tsx` (4 instances)
- `src/lib/zustandStorage.ts` (3 instances)
- `src/lib/supabaseSync.ts` (4 instances)
- `src/lib/indexedDB.ts` (3 instances)
- All API routes (1-2 each)
- `src/components/AuthProvider.tsx` (2 instances)

**Recommendation:** Replace with a structured logging service that can be silenced in production.

### Q4. Empty and Swallowed Catch Blocks (MEDIUM)

Errors silently swallowed without logging or recovery:

| File | Line | Pattern |
|------|------|---------|
| `src/lib/zustandStorage.ts` | 100-102 | `catch { /* Save failed */ }` |
| `src/components/HootFAB.tsx` | 243 | `catch { /* ignore */ }` |
| `src/components/HootFAB.tsx` | 448, 450 | `catch { /* pulse snapshot is optional */ }` |
| `src/lib/indexedDB.ts` | 142 | `catch { return null; }` |

### Q5. Type Safety Bypasses (MEDIUM)

10+ instances of `as any` or unsafe type assertions:

| File | Line | Pattern |
|------|------|---------|
| `src/hooks/useSoundEffects.ts` | 32-33 | `(window as any).webkitAudioContext` |
| `src/app/api/hoot-action/route.ts` | 251 | `hootFunctions as any` |
| `src/app/api/hoot-search/route.ts` | 25 | `} as any` |
| `src/app/chains/page.tsx` | 157 | `as unknown as QuestStep[]` |
| Multiple API routes | Various | `as any` for Gemini function declarations |

### Q6. ESLint Rule Bypasses (MEDIUM)

7+ `eslint-disable` comments indicate unresolved issues:

| File | Rule Disabled |
|------|---------------|
| `src/hooks/useNexusPulse.ts:527` | `react-hooks/exhaustive-deps` |
| `src/components/HootFAB.tsx:205` | `react-hooks/exhaustive-deps` |
| `src/components/AICoachWidget.tsx:50` | `react-hooks/exhaustive-deps` |
| `src/app/focus/page.tsx:47` | `react-hooks/preserve-manual-memoization` |
| `src/lib/supabase.ts:23` | `@typescript-eslint/no-explicit-any` |

Disabled `exhaustive-deps` rules are particularly concerning as they can cause stale closure bugs.

### Q7. Code Duplication (MEDIUM)

Repeated patterns that should be extracted:

- **`extractJSON()` function** duplicated in `generate-quest/route.ts` and `nexus-pulse/route.ts`
- **Category color mapping** repeated across multiple page components
- **API error response patterns** (mock fallback objects) repeated in all 13 API routes
- **Gemini client initialization** (`new GoogleGenerativeAI(...)`) duplicated in every API route
- **Validation error handling** (`try/catch ValidationError`) pattern repeated 10+ times in the store

### Q8. Stale Closure / Ref Patterns (MEDIUM)

Several `useRef` patterns risk stale closures:

| File | Lines | Issue |
|------|-------|-------|
| `src/components/HootFAB.tsx` | 141, 144-149 | Multiple refs synced across separate effects |
| `src/components/HootFAB.tsx` | 220-223 | Mutable ref accessed across effects |
| `src/components/AuthProvider.tsx` | 32, 53, 58 | Ref management across auth state changes |

### Q9. Race Conditions (MEDIUM)

| File | Location | Issue |
|------|----------|-------|
| `src/lib/zustandStorage.ts` | lines 11, 44-47 | `saveTimeout` and `timeoutId` module-level globals modified across async calls |
| `src/store/useGameStore.ts` | line 9 | `recurringTaskTimers` map stores setTimeout handles outside store; no cleanup on store reset |

### Q10. Missing API Response Validation (MEDIUM)

API responses from Gemini are used with minimal or no validation:

| File | Issue |
|------|-------|
| `src/app/quests/page.tsx:137-150` | Response from `/api/generate-quest` not validated before state update |
| `src/app/bosses/page.tsx:129-140` | Boss data from API used directly without schema validation |
| `src/app/chains/page.tsx:154-172` | Chain data cast with `as unknown as QuestStep[]` - no validation |
| `src/app/api/quest-command/route.ts:60` | Raw `JSON.parse(text)` with no validation of expected shape |

The `nexus-pulse/route.ts` is the one exception - it validates response fields properly (lines 82-92).

---

## Testing & Reliability

### T1. Zero Test Coverage (CRITICAL)

**No test files exist anywhere in the codebase.** There are:
- No unit tests
- No integration tests
- No end-to-end tests
- No test framework configured (no Jest, Vitest, Playwright, or Cypress)
- No `test` script in `package.json`

This is the single largest risk factor in the codebase. The 2,327-line store, complex AI integrations, and financial-impact API routes have zero automated verification.

### T2. No CI/CD Pipeline

No GitHub Actions, Vercel config, or other CI/CD configuration was found. The `lint` and `typecheck` scripts exist in `package.json` but are not enforced.

### T3. Recommended Test Strategy

**Priority 1 (Critical):**
- Unit tests for `useGameStore` actions (XP calculations, level progression, task completion, streak logic)
- Unit tests for `src/lib/validation.ts` (input sanitization)
- API route integration tests (auth verification, error handling)

**Priority 2 (High):**
- Component tests for critical flows (auth, task management)
- E2E tests for happy paths (create quest, complete task, earn XP)

**Priority 3 (Medium):**
- Hook tests (`useNexusPulse`, `useSoundEffects`)
- Zustand storage adapter tests

---

## Dependency Audit

### D1. `moment.js` Included (MEDIUM)

`moment` (v2.30.1) is listed as a production dependency. This library is:
- **Officially deprecated** by its maintainers
- ~300KB unminified, significantly impacting bundle size
- Mutable by design, which conflicts with React's immutability expectations

**Recommendation:** Replace with `date-fns` (tree-shakeable) or native `Intl.DateTimeFormat`.

### D2. `@types/canvas-confetti` in Production Dependencies (LOW)

```json
"dependencies": {
    "@types/canvas-confetti": "^1.9.0",  // Should be in devDependencies
}
```

Type definition packages should be in `devDependencies`. While this doesn't affect runtime behavior, it increases the production install size unnecessarily.

### D3. `next-pwa` May Be Outdated (LOW)

`next-pwa` v5.6.0 was built for the Pages Router. With Next.js 16 and App Router, consider alternatives like `@ducanh2912/next-pwa` or `serwist` which have better App Router support.

### D4. No Lock File Auditing

No `npm audit` or `pnpm audit` workflow is configured. Vulnerable transitive dependencies could go undetected.

### D5. Dependency Count

The project has 14 production dependencies and 10 dev dependencies. This is a reasonable count, though `moment.js` should be removed.

---

## Performance Concerns

### P1. Full State Blob Sync (HIGH)

Every Zustand state change triggers serialization of the **entire application state** (tasks, habits, goals, inventory, skills, vocab words, activity log, etc.) into a single JSONB blob. While debounced at 3 seconds (`src/lib/zustandStorage.ts:12`), this means:

- Large payloads sent over the network on every change
- The JSONB blob will grow unbounded as activity logs and completed tasks accumulate
- No incremental sync - full state replacement every time
- No conflict resolution beyond "last write wins"

### P2. Unbounded Array Growth (MEDIUM)

Several arrays in the store grow without limits:

| Array | Location | Issue |
|-------|----------|-------|
| `activityLog` | `useGameStore.ts` | Every action appends; never trimmed |
| `reflectionNotes` | `useGameStore.ts` | Daily entries accumulate forever |
| `vocabWords` | `useGameStore.ts` | All words kept including mastered |
| `tasks` (completed) | `useGameStore.ts` | Completed tasks kept in array |
| `habits.completedDates` | `useGameStore.ts` | Date strings accumulate per habit |

Over months of use, these arrays will degrade serialization performance and increase Supabase storage costs.

### P3. Large Component Bundles (MEDIUM)

The 1,100+ line components (`HootFAB.tsx`, `wordforge/components.tsx`) will produce large JavaScript bundles. Combined with `moment.js`, the initial page load will be heavier than necessary.

### P4. Achievement Checking on Every State Change (LOW)

`ACHIEVEMENTS` array (lines 605-631 in `useGameStore.ts`) contains condition functions that filter the entire tasks array. When `checkAchievements()` is called, it iterates all 23 achievements, each potentially scanning all tasks. This is called after every task completion.

---

## Database & Data Layer

### DB1. JSONB Blob Pattern (HIGH)

The `user_state` table stores the entire Zustand state as a single JSONB blob:

```sql
-- supabase/migrations/004_user_state_jsonb.sql
CREATE TABLE IF NOT EXISTS user_state (
    user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    state    JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Issues:**
- Cannot query individual fields (e.g., "find users with streak > 30")
- No data-level validation constraints (the CHECK constraints in migration 002 apply to old tables, not user_state)
- Entire state replaced on every sync - no partial updates
- RLS policy is correct (`auth.uid() = user_id`), which is good

### DB2. Orphaned Tables (LOW)

Migrations 001-003 created normalized tables (`profiles`, `tasks`, `habits`, `inventory`, `boss_battles`) with proper constraints and indexes. Migration 004 replaced the sync mechanism with a single JSONB blob but explicitly notes the old tables are "NOT dropped." This creates confusion about which tables are active.

### DB3. No Data Migration Path

There is no migration that moves data from the old normalized tables to the new `user_state` JSONB table. Users who had data in the old schema may have lost it.

---

## Configuration & Environment

### C1. Environment Variables Well-Documented (GOOD)

`.env.example` clearly documents all required variables with helpful comments about where to obtain each credential. `.gitignore` properly excludes `.env*` files.

### C2. No Runtime Environment Validation (MEDIUM)

Environment variables are checked ad-hoc in each API route:

```typescript
if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json({ /* mock response */ });
}
```

There is no centralized validation at startup. A missing variable is only discovered when that specific route is hit.

**Recommendation:** Use a validation library (e.g., `zod` or `t3-env`) to validate all required environment variables at build/startup time.

### C3. TypeScript Configuration (GOOD)

`tsconfig.json` has `strict: true` enabled, which is the correct baseline. Path aliases (`@/*`) are properly configured.

### C4. ESLint Configuration (ADEQUATE)

ESLint uses `next/core-web-vitals` and `next/typescript` presets. No custom rules are added, which means several useful rules (e.g., `no-console`, `no-unused-vars` strictness) are at defaults.

---

## Accessibility & PWA

### A1. Accessibility Basics Present (GOOD)

- `<SkipLink>` component exists for keyboard navigation
- `<main id="main-content">` landmark is properly set
- `lang="en"` set on `<html>` element
- `userScalable: true` in viewport meta (allows zooming)

### A2. PWA Configuration (ADEQUATE)

- `next-pwa` configured with service worker registration
- `manifest.json` referenced in metadata
- `themeColor` set for mobile browsers
- PWA disabled in development mode (correct)

---

## Prioritized Recommendations

### Priority 1: Critical (Do First)

1. **Add authentication to all API routes** - Create a shared `authenticateRequest()` middleware and apply to all 13 routes. This is the single most important fix.

2. **Add rate limiting** - Implement per-user rate limits on AI endpoints (e.g., 20 requests/minute for quest generation, 60/minute for Hoot chat).

3. **Set up a test framework and write critical tests** - Install Vitest + React Testing Library. Write tests for:
   - Store actions (XP, level, streak calculations)
   - Validation functions
   - API route error handling

4. **Add a `middleware.ts`** - Implement Next.js middleware for security headers (CSP, HSTS, X-Frame-Options) and authentication checks on protected routes.

### Priority 2: High (Do Soon)

5. **Split `useGameStore` into domain-specific stores** - Break the 2,327-line monolith into 5-7 focused stores. This is the highest-impact architectural improvement.

6. **Add API response validation** - Use Zod schemas to validate Gemini AI responses before using them in state updates.

7. **Replace `moment.js`** with `date-fns` or native `Intl` APIs.

8. **Add CI/CD pipeline** - GitHub Actions workflow running `lint`, `typecheck`, and `test` on every PR.

9. **Implement environment validation** - Validate all required env vars at startup with clear error messages.

### Priority 3: Medium (Improve Gradually)

10. **Extract duplicated code** - Create shared utilities for `extractJSON()`, Gemini client initialization, API error responses, and category color maps.

11. **Break up large components** - Extract `HootFAB` trigger engine into a separate hook; split `wordforge/components.tsx` into individual component files.

12. **Add structured logging** - Replace all `console.*` calls with a logging service that respects environment (silent in prod, verbose in dev).

13. **Implement bounded arrays** - Add maximum sizes to `activityLog`, `reflectionNotes`, and `habits.completedDates` with automatic trimming.

14. **Fix ESLint suppressions** - Address the underlying issues in the 7 `eslint-disable` locations rather than suppressing the warnings.

15. **Move `@types/canvas-confetti`** to devDependencies.

### Priority 4: Low (Nice to Have)

16. **Consider incremental sync** - Replace full-state JSONB sync with per-domain sync or use Supabase Realtime for change-based sync.

17. **Clean up orphaned database tables** - Either drop the old normalized tables or migrate data from them.

18. **Evaluate `next-pwa` replacement** - Consider `serwist` or `@ducanh2912/next-pwa` for better App Router compatibility.

19. **Add request/response logging** - Structured API request logging for debugging and monitoring.

20. **Consider feature flagging** - For the AI features that depend on external services, implement proper feature flags rather than runtime environment checks.

---

## Appendix: File Size Reference

| File | Lines | Role |
|------|-------|------|
| `src/store/useGameStore.ts` | 2,327 | Global state store |
| `src/components/HootFAB.tsx` | 1,174 | AI assistant FAB |
| `src/app/wordforge/components.tsx` | 1,108 | Vocabulary quiz |
| `src/app/quests/page.tsx` | 869 | Quest management |
| `src/app/page.tsx` | 726 | Dashboard |
| `src/hooks/useNexusPulse.ts` | 592 | AI pulse synthesis |
| `src/app/api/hoot-action/route.ts` | 338 | Hoot AI endpoint |
| `src/lib/validation.ts` | 202 | Input validation |
| `src/lib/indexedDB.ts` | 157 | Local storage |
| `src/lib/zustandStorage.ts` | 119 | Persistence adapter |
| `src/lib/supabaseSync.ts` | 85 | Cloud sync |

---

*End of audit report.*
