import { Dict } from '../../types';
import { Token } from './tokens';

/**
 * Shorthand expander: takes a tokenized decl value and returns a
 * partial style object. Handlers may return `null` to indicate the
 * value failed to parse; the caller then falls back to a string
 * pass-through with a dev warning.
 */
export type ShorthandHandler = (tokens: Token[]) => Dict<any> | null;

const registry: Record<string, ShorthandHandler> = Object.create(null);

export function register(prop: string, handler: ShorthandHandler): void {
  registry[prop] = handler;
}

export function getShorthand(prop: string): ShorthandHandler | undefined {
  return registry[prop];
}
