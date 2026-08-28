import { Token } from './tokens';

/**
 * Rewindable cursor over a {@link Token} array. Shorthand parsers use
 * {@link save} / {@link rewind} for backtracking and {@link expect} for
 * hard assertions.
 *
 * The class shape keeps one hidden class per consumer; field access is
 * monomorphic across all shorthand handlers.
 */
export class TokenStream {
  tokens: Token[];
  pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(offset: number = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  eof(): boolean {
    return this.pos >= this.tokens.length;
  }

  save(): number {
    return this.pos;
  }

  rewind(saved: number): void {
    this.pos = saved;
  }
}
