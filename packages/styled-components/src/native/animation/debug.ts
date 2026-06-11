/**
 * Shared debug-logging flag for the native animation + scroll timeline
 * machinery. Lives in its own leaf module so `scrollTimeline.ts` can
 * read it without importing `animation/index.ts` (which imports
 * scrollTimeline; a direct import would be circular).
 */
let enabled = false;

export function setDebugEnabled(on: boolean): void {
  enabled = on;
}

export function isDebugEnabled(): boolean {
  return enabled;
}
