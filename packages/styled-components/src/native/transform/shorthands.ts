import { Dict } from '../../types';
import { Token } from './tokens';

/**
 * Shorthand expander: takes a tokenized decl value (and the original
 * unparsed value string) and returns a partial style object. Handlers
 * may return `null` to indicate the value failed to parse; the caller
 * then falls back to a string pass-through with a dev warning.
 *
 * `rawValue` is the exact authored value. Most handlers ignore it and
 * work off tokens; grid passthrough handlers use it to re-emit the raw
 * CSS untouched on rn-web.
 */
export type ShorthandHandler = (tokens: Token[], rawValue: string) => Dict<any> | null;

const registry: Record<string, ShorthandHandler> = Object.create(null);

export function register(prop: string, handler: ShorthandHandler): void {
  registry[prop] = handler;
}

export function getShorthand(prop: string): ShorthandHandler | undefined {
  return registry[prop];
}
