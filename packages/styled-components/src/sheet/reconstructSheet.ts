import { IS_BROWSER } from '../constants';
import { cloneOrder } from './Order';
import { getRehydrationContainer, rehydrateSheet } from './Rehydration';
import StyleSheet, { type SheetConstructorArgs, withTagFollowing } from './Sheet';

/**
 * Reconstructs `sheet` with merged options (such as a new target or nonce), optionally copying its
 * registered names. Browser sheets inherit a copy of the parent's group order within the same
 * container, or start a fresh order and rehydrate when switching containers (Document or ShadowRoot).
 * @internal
 */
export const reconstructSheet = (
  sheet: StyleSheet,
  options: SheetConstructorArgs,
  withNames = true
): StyleSheet => {
  const newSheet = new StyleSheet(
    { ...sheet.options, ...options },
    (withNames && sheet.names) || undefined
  );

  const switchedContainer =
    !newSheet.server &&
    IS_BROWSER &&
    newSheet.options.target !== sheet.options.target &&
    getRehydrationContainer(sheet.options.target) !==
      getRehydrationContainer(newSheet.options.target);

  if (switchedContainer) {
    rehydrateSheet(newSheet);
  } else if (!sheet.server && !newSheet.server) {
    // A browser sheet in the same container lays its groups out as its parent does.
    newSheet.order = withTagFollowing(newSheet, cloneOrder(sheet.order));
  }

  return newSheet;
};
