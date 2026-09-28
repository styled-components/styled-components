import {
  AT,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  CLOSE_PAREN,
  COLON,
  COMMA,
  DIGIT_0,
  DIGIT_9,
  DOUBLE_QUOTE,
  HYPHEN,
  isIdentChar,
  isWS,
  LOWER_L,
  LOWER_R,
  LOWER_U,
  NUL,
  OPEN_BRACE,
  OPEN_BRACKET,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
  SLASH,
  UPPER_S,
} from '../utils/charCodes';
import {
  AtRuleNode,
  DeclNode,
  DYN,
  InterpolationNode,
  KeyframeFrame,
  KeyframesNode,
  Node,
  NodeKind,
  Root,
  RuleNode,
  SlotHead,
  TemplateValue,
} from './ast';
import { isKeyframesName } from './atRuleNames';
import { stampAtClass, stampRuleClass } from './nativePlan';

/**
 * Scan `s[start..end]` tracking quote / paren nesting (and CSS `\X`
 * escape: backslash + next byte are consumed atomically). Return the
 * first index whose top-level byte equals `a`, `b`, `c`, or `d`, or
 * `end` if none match. Pass `-1` for unused stop slots.
 *
 * The state is local; callers that resume scanning past a known top-
 * level boundary (`;` `{` `}` `:` `,`) restart with a fresh state
 * without losing correctness, because those bytes always sit at top
 * level by definition.
 *
 * Shared by `parseBlock`, `parseAtRule`, `parseKeyframesBody`, and
 * `parseFrameDecls` so the common quote/paren/escape state machine
 * ships once instead of four times.
 */
export function scanQP(
  s: string,
  start: number,
  end: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  let i = start;
  let paren = 0;
  let quote = 0;
  while (i < end) {
    const ch = s.charCodeAt(i);
    if (quote !== 0) {
      if (ch === BACKSLASH) {
        i += 2;
        continue;
      }
      if (ch === quote) quote = 0;
    } else if (ch === BACKSLASH) {
      i += 2;
      continue;
    } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
      quote = ch;
    } else if (ch === OPEN_PAREN) {
      paren++;
    } else if (ch === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (paren === 0 && (ch === a || ch === b || ch === c || ch === d)) {
      return i;
    }
    i++;
  }
  return end;
}

/**
 * Bracket-aware variant of {@link scanQP}. Shared by `splitTopLevelCommas`,
 * `stripCommaSpaces` (selector-side comma normalization), and emit-web's
 * `stripCombinatorSpaces` so `[attr=",b"]` stays opaque to the outer
 * scan.
 */
export function scanQPB(
  s: string,
  start: number,
  end: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  let i = start;
  let paren = 0;
  let bracket = 0;
  let quote = 0;
  while (i < end) {
    const ch = s.charCodeAt(i);
    if (quote !== 0) {
      if (ch === BACKSLASH) {
        i += 2;
        continue;
      }
      if (ch === quote) quote = 0;
    } else if (ch === BACKSLASH) {
      i += 2;
      continue;
    } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
      quote = ch;
    } else if (ch === OPEN_PAREN) {
      paren++;
    } else if (ch === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (ch === OPEN_BRACKET) {
      bracket++;
    } else if (ch === CLOSE_BRACKET) {
      if (bracket > 0) bracket--;
    } else if (paren === 0 && bracket === 0 && (ch === a || ch === b || ch === c || ch === d)) {
      return i;
    }
    i++;
  }
  return end;
}

export interface ParseOptions {
  /**
   * When `true`, skips comma-space stripping inside declaration values (e.g.
   * `color 0.2s, blue` stays unchanged). The web path defaults to stripping so
   * emitted shorthand matches the long-standing minified shape; the native
   * transform pipeline sets this to `true` so the tokenizer sees font-family
   * fallback chains intact.
   */
  keepCommaSpaces?: boolean;
  /** Per-slot knowledge for a templated parse; ignored unless `templates` is `true`. */
  slots?: SlotTable;
  /**
   * When `true`, `\0S<n>\0` markers in the input are template slots (the
   * joined form built by `parseSource`), and the parser assigns each one its
   * role: an `InterpolationNode`, a rule or frame head, or a
   * {@link TemplateValue} field. Default `false`: the markers are opaque
   * text and the AST is `Root<string>`.
   */
  templates?: boolean;
}

/** Tokenizer state at a slot's position in the template. */
export interface SlotEntry {
  /** Open parentheses around the slot, an unquoted `url(` included. */
  parenDepth: number;
  /** Char code of the quote the slot sits inside; 0 for none. */
  quote: number;
  /** Whether the slot sits inside an unquoted `url(`. */
  url: boolean;
}

/** Per-slot knowledge shared between `parseSource` and the parser. */
export interface SlotTable {
  /**
   * Slots whose value is a client reference, which the server cannot
   * resolve; a head holding one is marked `unresolved`. `null` when none is.
   */
  clientRefs: ReadonlyArray<boolean> | null;
  /** Written by the parser: the entry state of each slot it keeps, `null` for the rest. */
  entries: Array<SlotEntry | null>;
  /**
   * Slots whose value ends a declaration missing its `;` when met in the
   * declaration's value; `null` when no slot can.
   */
  recover: ReadonlyArray<boolean> | null;
  /** Written by the parser: `true` for each slot whose value splices as statements (standalone and head slots). */
  standalone: boolean[];
}

/** Entry state of a slot at the top level of a statement. Shared, never mutated. */
export const TOP_LEVEL: SlotEntry = Object.freeze({ parenDepth: 0, quote: 0, url: false });

/**
 * Parse a preprocessed CSS string into a parser AST.
 *
 * Assumes the input has already passed through `normalize` from
 * src/utils/normalize.ts, which normalizes braces, strips line comments,
 * and handles unbalanced strings. This parser is STRICT; it assumes
 * well-formed input.
 */
export function parse(
  css: string,
  options: ParseOptions & { templates: true }
): Root<string | TemplateValue>;
export function parse(css: string, options?: ParseOptions): Root<string>;
export function parse(css: string, options?: ParseOptions): Root<string | TemplateValue> {
  const templates = !!options?.templates;
  const slots = templates && options?.slots !== undefined ? options.slots : null;
  const ctx: ParseContext = {
    css,
    dyn: false,
    len: css.length,
    i: 0,
    keepCommaSpaces: !!options?.keepCommaSpaces,
    recover: slots !== null ? slots.recover : null,
    slots,
    templates,
  };
  return parseBlock(ctx);
}

interface ParseContext {
  css: string;
  /**
   * Whether the node being read so far holds a slot: a {@link TemplateValue}
   * field, a head, or a splice. Saved and cleared around each node that
   * carries {@link DYN}, then merged back so it bubbles to the parent.
   */
  dyn: boolean;
  len: number;
  i: number;
  keepCommaSpaces: boolean;
  /** {@link SlotTable.recover}; `null` keeps the statement scan on the slot-blind path. */
  recover: ReadonlyArray<boolean> | null;
  slots: SlotTable | null;
  /**
   * Runtime gate for slot detection. Only `parseSource` (templated
   * tagged-template input) sets this `true`; static-string callers
   * (`toNativeStyles`, `extractBaseDeclPairs`, `parseStringFragment`,
   * any test) leave it `false`, so `\0S<n>\0` bytes pass through as opaque
   * CSS content.
   *
   * Closes the attack surface where untrusted user-supplied
   * interpolation values reach `parse()` via the fallback re-parse path
   * (`buildHashCSS` → `toNativeStyles`) and could be misread as slots,
   * producing a `TemplateValue` field where the type system promised a
   * `string` and crashing downstream consumers.
   */
  templates: boolean;
}

/** End of the `\0S<digits>\0` slot marker starting at `i`, or -1 when there is none. */
function slotEnd(css: string, i: number, len: number): number {
  if (css.charCodeAt(i) !== NUL || css.charCodeAt(i + 1) !== UPPER_S) return -1;
  let j = i + 2;
  while (j < len) {
    const c = css.charCodeAt(j);
    if (c >= DIGIT_0 && c <= DIGIT_9) j++;
    else break;
  }
  if (j === i + 2 || j >= len || css.charCodeAt(j) !== NUL) return -1;
  return j + 1;
}

/** Slot index of the marker spanning `[start, end)`, as found by {@link slotEnd}. */
function slotIndex(css: string, start: number, end: number): number {
  let index = 0;
  for (let j = start + 2; j < end - 1; j++) index = index * 10 + (css.charCodeAt(j) - DIGIT_0);
  return index;
}

function keepSlot(ctx: ParseContext, index: number, entry: SlotEntry): void {
  if (ctx.slots !== null) ctx.slots.entries[index] = entry;
}

/** Keep a slot whose value splices as statements (a standalone or head slot). */
function keepSplice(ctx: ParseContext, index: number): void {
  ctx.dyn = true;
  if (ctx.slots !== null) {
    ctx.slots.entries[index] = TOP_LEVEL;
    ctx.slots.standalone[index] = true;
  }
}

const DYN_FLAG: PropertyDescriptor = { configurable: true, enumerable: false, value: true };

/**
 * Tag a node that holds a slot, or has a descendant that does, with
 * `[DYN] = true`; absence is the static encoding. Non-enumerable so the flag
 * is invisible to `toEqual`, `JSON.stringify`, `Object.keys`, and `for..in`
 * (Jest's `equals()` walks both `Object.keys` and
 * `Object.getOwnPropertySymbols`, and skips only a non-enumerable symbol).
 */
function markDyn(node: Node): void {
  Object.defineProperty(node, DYN, DYN_FLAG);
}

/**
 * Slots at a statement start separated only by whitespace. `gaps[k]` is the
 * whitespace after `slots[k]`.
 */
interface Run {
  gaps: string[];
  /** End of the last slot's marker. */
  lastEnd: number;
  /** Start of the last slot's marker. */
  lastStart: number;
  /** First non-whitespace position after the Run. */
  next: number;
  slots: number[];
}

function readRun(css: string, start: number, end: number, len: number): Run {
  const gaps: string[] = [];
  const slots: number[] = [];
  for (;;) {
    slots.push(slotIndex(css, start, end));
    let w = end;
    while (w < len && isWS(css.charCodeAt(w))) w++;
    gaps.push(css.substring(end, w));
    const nextEnd = w < len ? slotEnd(css, w, len) : -1;
    if (nextEnd === -1) return { gaps, lastEnd: end, lastStart: start, next: w, slots };
    start = w;
    end = nextEnd;
  }
}

/**
 * Where the declaration after a Run starts. The last slot names the
 * property when it is glued to the statement text, or when the statement
 * starts with `:` (whitespace before the colon, which a statement of its
 * own could not be a declaration with).
 */
function runDeclStart(css: string, run: Run): number {
  return run.next === run.lastEnd || css.charCodeAt(run.next) === COLON ? run.lastStart : run.next;
}

/**
 * Read the Run at statement start `i`, or `null` when none starts there. A
 * Run followed by the end of the list, `;`, `}`, or `@` is Standalone: its
 * slots splice into `out`, `ctx.i` moves past it (and a `;` right after it),
 * and the result is `false`. Gated on `ctx.templates`: untrusted CSS input
 * (rawCSS and the re-parse of filled values) must not fabricate slots.
 */
function statementRun<T>(
  ctx: ParseContext,
  out: Array<T | InterpolationNode>,
  i: number
): Run | null | false {
  const css = ctx.css;
  const len = ctx.len;
  if (!ctx.templates || css.charCodeAt(i) !== NUL) return null;
  const end = slotEnd(css, i, len);
  if (end === -1) return null;
  const run = readRun(css, i, end, len);
  const next = run.next < len ? css.charCodeAt(run.next) : -1;
  if (next === -1 || next === SEMICOLON || next === CLOSE_BRACE || next === AT) {
    pushRunSlots(ctx, out, run, run.slots.length);
    ctx.i = next === SEMICOLON ? run.next + 1 : run.next;
    return false;
  }
  return run;
}

/** Push the first `count` slots of `run` as standalone splices. */
function pushRunSlots<T>(
  ctx: ParseContext,
  out: Array<T | InterpolationNode>,
  run: Run,
  count: number
): void {
  for (let k = 0; k < count; k++) {
    out.push({ kind: NodeKind.Interpolation, index: run.slots[k] });
    keepSplice(ctx, run.slots[k]);
  }
}

/** Head for the first `count` slots of `run`, with `restText` following them. */
function runHead(ctx: ParseContext, run: Run, count: number, restText: string): SlotHead {
  const clientRefs = ctx.slots !== null ? ctx.slots.clientRefs : null;
  let unresolved = false;
  for (let k = 0; k < count; k++) {
    keepSplice(ctx, run.slots[k]);
    if (clientRefs !== null && clientRefs[run.slots[k]]) unresolved = true;
  }
  const head: SlotHead = {
    gaps: count === run.gaps.length ? run.gaps : run.gaps.slice(0, count),
    rest: templateOrString(ctx, restText),
    slots: count === run.slots.length ? run.slots : run.slots.slice(0, count),
  };
  if (unresolved) head.unresolved = true;
  return head;
}

/**
 * Whether the slot at `slot` ends the declaration whose colon is at
 * `colon`: its value must hold a significant item before the slot other
 * than `:`, `,`, `(`, or `/`. Only reached at parenthesis depth 0 outside
 * strings, where the statement scan stops.
 */
function recoversAt(ctx: ParseContext, slot: number, end: number, colon: number): boolean {
  const recover = ctx.recover;
  if (recover === null || colon === -1 || !recover[slotIndex(ctx.css, slot, end)]) return false;
  const css = ctx.css;
  for (let p = slot - 1; p > colon; p--) {
    const c = css.charCodeAt(p);
    if (isWS(c)) continue;
    return c !== COLON && c !== COMMA && c !== OPEN_PAREN && c !== SLASH;
  }
  return false;
}

/** {@link scanQP} that also stops at a NUL at the top level, for slot recovery. */
function scanQPOrNul(
  s: string,
  start: number,
  end: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  let i = start;
  let paren = 0;
  let quote = 0;
  while (i < end) {
    const ch = s.charCodeAt(i);
    if (quote !== 0) {
      if (ch === BACKSLASH) {
        i += 2;
        continue;
      }
      if (ch === quote) quote = 0;
    } else if (ch === BACKSLASH) {
      i += 2;
      continue;
    } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
      quote = ch;
    } else if (ch === OPEN_PAREN) {
      paren++;
    } else if (ch === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (paren === 0 && (ch === a || ch === b || ch === c || ch === d || ch === NUL)) {
      return i;
    }
    i++;
  }
  return end;
}

/**
 * Single-pass parse of a CSS block body. A keyframe frame's body (`frame`)
 * holds only declarations and splices: `{` does not stop the statement scan
 * and `@` does not start an at-rule, so either reads as declaration text.
 */
function parseBlock(ctx: ParseContext, frame: true): Array<DeclNode | InterpolationNode>;
function parseBlock(ctx: ParseContext, frame?: false): Node[];
function parseBlock(ctx: ParseContext, frame = false): Node[] {
  const css = ctx.css;
  const len = ctx.len;
  const out: Node[] = [];
  const openBrace = frame ? -1 : OPEN_BRACE;

  while (ctx.i < len) {
    // Skip leading whitespace and stray semicolons
    let i = ctx.i;
    while (i < len) {
      const c = css.charCodeAt(i);
      if (isWS(c) || c === SEMICOLON) i++;
      else break;
    }
    if (i >= len) {
      ctx.i = i;
      break;
    }

    const first = css.charCodeAt(i);

    if (first === CLOSE_BRACE) {
      ctx.i = i + 1;
      return out;
    }

    if (first === AT && !frame) {
      ctx.i = i;
      out.push(parseAtRule(ctx));
      continue;
    }

    // A Run that is not Standalone is classified by the statement scan below:
    // a rule head when the statement ends in `{`, otherwise standalone slots
    // before a declaration.
    const run = statementRun(ctx, out, i);
    if (run === false) continue;
    if (run !== null) i = run.next === run.lastEnd ? run.lastStart : run.next;
    const start = i;

    let colon = -1;
    // `while (true)` (not `while (i < len)`) so that a COLON found at the
    // very last position can still reach the EOF branch on the next scan.
    while (true) {
      const stop =
        ctx.recover === null
          ? scanQP(css, i, len, COLON, openBrace, SEMICOLON, CLOSE_BRACE)
          : scanQPOrNul(css, i, len, COLON, openBrace, SEMICOLON, CLOSE_BRACE);
      if (stop >= len) {
        // EOF reached. Treat as terminal declaration if we saw a colon.
        const declStart = run === null ? start : leadDecl(ctx, out, run);
        if (colon !== -1) pushDecl(ctx, out, declStart, colon, stop);
        ctx.i = stop;
        return out;
      }
      const c = css.charCodeAt(stop);
      if (c === COLON) {
        if (colon === -1) colon = stop;
        i = stop + 1;
        continue;
      }
      if (c === NUL) {
        const end = slotEnd(css, stop, len);
        if (end !== -1 && recoversAt(ctx, stop, end, colon)) {
          const declStart = run === null ? start : leadDecl(ctx, out, run);
          pushDecl(ctx, out, declStart, colon, stop);
          const index = slotIndex(css, stop, end);
          out.push({ kind: NodeKind.Interpolation, index });
          keepSplice(ctx, index);
          ctx.i = end;
          break;
        }
        i = end === -1 ? stop + 1 : end;
        continue;
      }
      if (c === OPEN_BRACE) {
        const selectorText = trimRange(css, start, stop);
        const lead =
          run === null ? 0 : run.next === run.lastEnd ? run.slots.length - 1 : run.slots.length;
        ctx.i = stop + 1;
        const outerDyn = ctx.dyn;
        ctx.dyn = false;
        let node: RuleNode;
        if (run !== null && lead > 0) {
          const head = runHead(ctx, run, lead, selectorText);
          node = { kind: NodeKind.Rule, selectors: [], children: parseBlock(ctx), head };
        } else {
          const selectors =
            selectorText.indexOf(',') === -1
              ? [selectorText]
              : splitTopLevelCommas(selectorText, true);
          const children = parseBlock(ctx);
          node = {
            kind: NodeKind.Rule,
            selectors: selectorsToTemplate(ctx, selectors),
            children,
          };
        }
        if (ctx.dyn) markDyn(node);
        else ctx.dyn = outerDyn;
        // Native build only: stamp parse-time classification for the
        // bucket router in `compileNative.ts`. Web bundles tree-shake
        // this branch out via `__NATIVE__ === false` literal replace.
        if (__NATIVE__) stampRuleClass(node);
        out.push(node);
        break;
      }
      // c is SEMICOLON or CLOSE_BRACE
      const declStart = run === null ? start : leadDecl(ctx, out, run);
      if (colon !== -1) pushDecl(ctx, out, declStart, colon, stop);
      if (c === CLOSE_BRACE) {
        ctx.i = stop + 1;
        return out;
      }
      ctx.i = stop + 1;
      break;
    }
  }

  return out;
}

/**
 * Push the slots of `run` that stand before the declaration following it,
 * and return where that declaration starts.
 */
function leadDecl(ctx: ParseContext, out: Node[], run: Run): number {
  const declStart = runDeclStart(ctx.css, run);
  pushRunSlots(
    ctx,
    out,
    run,
    declStart === run.lastStart ? run.slots.length - 1 : run.slots.length
  );
  return declStart;
}

function pushDecl(ctx: ParseContext, out: Node[], start: number, colon: number, end: number): void {
  const prop = trimRange(ctx.css, start, colon);
  if (!prop) return;
  const value = normalizeValue(ctx, colon + 1, end);
  // Empty value is invalid for regular properties (drop), but valid for
  // custom properties; `--my-prop: ;` is a legitimate CSS declaration
  // (CSS Custom Properties L1) used by scroll-driven animations and other
  // techniques that rely on the empty value as a "guaranteed-invalid" sentinel.
  if (!value && !isCustomProperty(prop)) return;
  const propField = templateOrString(ctx, prop);
  const valueField = templateOrString(ctx, value);
  const node: DeclNode = { kind: NodeKind.Decl, prop: propField, value: valueField };
  if (propField !== prop || valueField !== value) markDyn(node);
  out.push(node);
}

/** Apply {@link templateOrString} to each entry; allocate fresh array only if any entry converts. */
function selectorsToTemplate(
  ctx: ParseContext,
  selectors: string[]
): Array<string | TemplateValue> {
  if (!ctx.templates) return selectors;
  let out: Array<string | TemplateValue> | null = null;
  for (let i = 0; i < selectors.length; i++) {
    const v = templateOrString(ctx, selectors[i]);
    if (v !== selectors[i]) {
      if (out === null) out = selectors.slice();
      out[i] = v;
    }
  }
  return out ?? selectors;
}

/**
 * Convert a slot-bearing CSS field (`color: \0S0\0;`-style) into a
 * structural {@link TemplateValue} splice: chunks between slots + parallel
 * slot indices. Strings without slots return as-is (the fast path; most
 * fields don't carry interpolations). Records each slot's entry state,
 * reading the field from its start: every field starts at the top level of
 * its statement or selector-list part.
 *
 * Other `\0`-prefixed sequences (notably the createTheme.native.ts
 * `\0sc:` token namespace) ride through opaquely; they're preserved in
 * chunks and never become slot references.
 */
function templateOrString(ctx: ParseContext, s: string): string | TemplateValue {
  if (!ctx.templates || s.indexOf('\0') === -1) return s;
  const len = s.length;
  let chunks: string[] | null = null;
  const slots: number[] = [];
  let last = 0;
  let paren = 0;
  let quote = 0;
  // Parenthesis depth of the unquoted `url(` being read; 0 for none.
  let url = 0;
  for (let i = 0; i < len; i++) {
    const c = s.charCodeAt(i);
    if (c === NUL) {
      const end = slotEnd(s, i, len);
      if (end !== -1) {
        if (chunks === null) chunks = [];
        chunks.push(s.substring(last, i));
        const index = slotIndex(s, i, end);
        slots.push(index);
        keepSlot(
          ctx,
          index,
          paren === 0 && quote === 0 ? TOP_LEVEL : { parenDepth: paren, quote, url: url !== 0 }
        );
        last = end;
        i = end - 1;
        continue;
      }
    }
    if (c === BACKSLASH) {
      // A backslash before a slot escapes the value's first code point, which
      // the fill reads; the marker itself is never escaped.
      if (s.charCodeAt(i + 1) !== NUL) i++;
    } else if (quote !== 0) {
      if (c === quote) quote = 0;
    } else if (url !== 0) {
      if (c === CLOSE_PAREN) {
        paren--;
        url = 0;
      }
    } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      quote = c;
    } else if (c === OPEN_PAREN) {
      paren++;
      if (opensUnquotedUrl(s, i)) url = paren;
    } else if (c === CLOSE_PAREN) {
      if (paren > 0) paren--;
    }
  }
  if (chunks === null) return s;
  chunks.push(s.substring(last));
  ctx.dyn = true;
  return { chunks, slots };
}

/**
 * Whether the `(` at `i` opens an unquoted `url(`: the name before it is
 * `url` (any case) and its first non-whitespace argument character is not a
 * quote.
 */
function opensUnquotedUrl(s: string, i: number): boolean {
  if (i < 3) return false;
  if ((s.charCodeAt(i - 1) | 0x20) !== LOWER_L) return false;
  if ((s.charCodeAt(i - 2) | 0x20) !== LOWER_R) return false;
  if ((s.charCodeAt(i - 3) | 0x20) !== LOWER_U) return false;
  if (i > 3 && isIdentChar(s.charCodeAt(i - 4))) return false;
  let j = i + 1;
  while (j < s.length && isWS(s.charCodeAt(j))) j++;
  const next = s.charCodeAt(j);
  return next !== DOUBLE_QUOTE && next !== SINGLE_QUOTE;
}

/** A CSS custom property starts with `--` (two leading hyphens). */
export function isCustomProperty(prop: string): boolean {
  return prop.length > 2 && prop.charCodeAt(0) === HYPHEN && prop.charCodeAt(1) === HYPHEN;
}

/**
 * Extract, trim, and comma-normalize a declaration value in a single pass.
 * Strips whitespace after top-level commas by default for the web emit path.
 * When the context opts out (native path), the raw value is returned so
 * the native transform's tokenizer can parse comma-separated fallback chains.
 */
function normalizeValue(ctx: ParseContext, start: number, end: number): string {
  const css = ctx.css;
  while (start < end) {
    const c = css.charCodeAt(start);
    if (isWS(c)) start++;
    else break;
  }
  while (end > start) {
    const c = css.charCodeAt(end - 1);
    if (isWS(c)) end--;
    else break;
  }
  if (start >= end) return '';

  const slice = css.substring(start, end);
  if (ctx.keepCommaSpaces || slice.indexOf(',') === -1) return slice;

  return stripCommaSpaces(slice);
}

/**
 * Strip whitespace after top-level commas (outside parens/brackets/strings).
 * Optimistic: defer the substring + concat work until we actually find
 * whitespace to strip after a top-level comma. Inputs whose commas are
 * already tight (`a,b,c`);common in compact author CSS;pay only the
 * single charCode walk and return unchanged. Exported for the emitter's
 * at-rule prelude handling.
 */
export function stripCommaSpaces(s: string): string {
  if (s.indexOf(',') === -1) return s;
  const len = s.length;
  let out = '';
  let segStart = 0;
  let i = 0;
  while (i < len) {
    const comma = scanQPB(s, i, len, COMMA, -1, -1, -1);
    if (comma >= len) break;
    // Look ahead: only commit a segment if there's whitespace to strip.
    let j = comma + 1;
    while (j < len) {
      const n = s.charCodeAt(j);
      if (isWS(n)) j++;
      else break;
    }
    if (j > comma + 1) {
      out += s.substring(segStart, comma + 1);
      segStart = j;
    }
    i = j;
  }

  // No top-level commas with trailing whitespace → return original string.
  if (segStart === 0) return s;
  if (segStart < len) out += s.substring(segStart, len);
  return out;
}

function trimRange(css: string, start: number, end: number): string {
  while (start < end) {
    const c = css.charCodeAt(start);
    if (isWS(c)) start++;
    else break;
  }
  while (end > start) {
    const c = css.charCodeAt(end - 1);
    if (isWS(c)) end--;
    else break;
  }
  return start < end ? css.substring(start, end) : '';
}

function isNameStop(code: number): boolean {
  return isWS(code) || code === OPEN_BRACE || code === SEMICOLON;
}

function parseAtRule(ctx: ParseContext): AtRuleNode | KeyframesNode {
  const outerDyn = ctx.dyn;
  ctx.dyn = false;
  const node = readAtRule(ctx);
  if (ctx.dyn) markDyn(node);
  else ctx.dyn = outerDyn;
  return node;
}

function readAtRule(ctx: ParseContext): AtRuleNode | KeyframesNode {
  const css = ctx.css;
  const len = ctx.len;
  let j = ctx.i + 1;

  // Read the at-rule name up to whitespace, `{`, or `;`.
  while (j < len) {
    const c = css.charCodeAt(j);
    if (isNameStop(c)) break;
    j++;
  }
  const name = css.substring(ctx.i + 1, j);

  // Skip whitespace before prelude
  while (j < len) {
    const c = css.charCodeAt(j);
    if (isWS(c)) j++;
    else break;
  }

  // Scan prelude until `{`, `;`, `}`, or EOF
  const preludeStart = j;
  j = scanQP(css, j, len, OPEN_BRACE, SEMICOLON, CLOSE_BRACE, -1);

  const prelude = trimRange(css, preludeStart, j);
  const nameField = templateOrString(ctx, name);
  const preludeField = templateOrString(ctx, prelude);

  // Past the end, `charCodeAt` is NaN: neither `{` nor `;`.
  const delim = css.charCodeAt(j);
  if (delim !== OPEN_BRACE) {
    ctx.i = delim === SEMICOLON ? j + 1 : j;
    const node: AtRuleNode = {
      kind: NodeKind.AtRule,
      name: nameField,
      prelude: preludeField,
      children: null,
    };
    if (__NATIVE__) stampAtClass(node);
    return node;
  }

  ctx.i = j + 1;

  if (isKeyframesName(name)) {
    const frames = parseKeyframesBody(ctx);
    return { kind: NodeKind.Keyframes, name: nameField, prelude: preludeField, frames };
  }

  const children = parseBlock(ctx);
  const node: AtRuleNode = {
    kind: NodeKind.AtRule,
    name: nameField,
    prelude: preludeField,
    children,
  };
  if (__NATIVE__) stampAtClass(node);
  return node;
}

function parseKeyframesBody(ctx: ParseContext): Array<KeyframeFrame | InterpolationNode> {
  const css = ctx.css;
  const len = ctx.len;
  const frames: Array<KeyframeFrame | InterpolationNode> = [];

  while (ctx.i < len) {
    // Skip whitespace
    while (ctx.i < len) {
      const c = css.charCodeAt(ctx.i);
      if (isWS(c)) ctx.i++;
      else break;
    }
    if (ctx.i >= len) break;

    const c = css.charCodeAt(ctx.i);
    if (c === CLOSE_BRACE) {
      ctx.i++;
      return frames;
    }

    // In the frame list a Run heads a frame when the text after it reaches
    // `{` (its slots resolve to stops); anything else makes it a frame splice.
    const run = statementRun(ctx, frames, ctx.i);
    if (run === false) continue;
    const start = run === null ? ctx.i : run.next === run.lastEnd ? run.lastStart : run.next;
    const lead =
      run === null ? 0 : run.next === run.lastEnd ? run.slots.length - 1 : run.slots.length;

    // Scan for `{`
    const j = scanQP(css, start, len, OPEN_BRACE, CLOSE_BRACE, -1, -1);

    if (j >= len || css.charCodeAt(j) !== OPEN_BRACE) {
      if (run !== null) pushRunSlots(ctx, frames, run, lead);
      // Stop at the `}`: it closes the @keyframes block itself.
      ctx.i = j;
      continue;
    }

    const stopsText = trimRange(css, start, j);
    ctx.i = j + 1;

    if (run !== null && lead > 0) {
      const head = runHead(ctx, run, lead, stopsText);
      frames.push({ stops: [], children: parseBlock(ctx, true), head });
      continue;
    }

    const stopsRaw =
      stopsText.indexOf(',') === -1 ? [stopsText] : splitTopLevelCommas(stopsText, true);
    const children = parseBlock(ctx, true);
    frames.push({ stops: selectorsToTemplate(ctx, stopsRaw), children });
  }

  return frames;
}

/**
 * Split a comma-separated list at the top level only, preserving commas
 * inside `:is()`, `:where()`, `:has()`, `[attr="a,b"]`, quoted strings,
 * and any other paren/bracket-bounded context. Used in two modes:
 *
 *   - parser-side (`trim=true`): each part is trimmed and empty parts are
 *     dropped; matches the contract for selectors and keyframe stops.
 *   - emit-side (`trim=false`): substrings preserved verbatim; matches
 *     the contract for selector cross-product and the `rscPlugin` selector
 *     rewriter where downstream callers expect raw segments.
 */
export function splitTopLevelCommas(raw: string, trim = false): string[] {
  if (raw.indexOf(',') === -1) {
    if (!trim) return [raw];
    const single = trimRange(raw, 0, raw.length);
    return single ? [single] : [];
  }
  const out: string[] = [];
  const len = raw.length;
  let start = 0;
  let i = 0;
  while (i < len) {
    const comma = scanQPB(raw, i, len, COMMA, -1, -1, -1);
    if (comma >= len) break;
    if (trim) {
      const part = trimRange(raw, start, comma);
      if (part) out.push(part);
    } else {
      out.push(raw.substring(start, comma));
    }
    start = comma + 1;
    i = start;
  }
  if (trim) {
    const tail = trimRange(raw, start, len);
    if (tail) out.push(tail);
  } else {
    out.push(raw.substring(start, len));
  }
  return out;
}
