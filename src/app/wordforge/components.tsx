/**
 * Barrel re-export for backward-compatible imports.
 *
 * The actual implementations now live in dedicated files:
 *   - DailyWordsTab.tsx
 *   - ReviewTab.tsx
 *   - ProgressTab.tsx
 *   - shared.ts  (helpers, constants, types)
 */
export { default as DailyWordsTab } from './DailyWordsTab';
export { default as ReviewTab } from './ReviewTab';
export { default as ProgressTab } from './ProgressTab';
export { default as CollectionTab } from './CollectionTab';
