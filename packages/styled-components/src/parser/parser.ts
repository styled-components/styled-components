import {
  AT,
  BACKSLASH,
  CLOSE_BRACE,
  COLON,
  COMMA,
  DIGIT_0,
  DIGIT_9,
  HYPHEN,
  isWS,
  NUL,
  OPEN_BRACE,
  OPEN_PAREN,
  SEMICOLON,
  SLASH,
  UPPER_S,
} from '../utils/charCodes';
import {
  ALWAYS_READ,
  AtRuleNode,
  DeclNode,
  DYN,
  InterpolationNode,
  KeyframesNode,
  Node,
  NodeKind,
  Root,
  RuleNode,
  SlotHead,
  TemplateValue,
} from './ast';
import { stampAtClass, stampRuleClass } from './nativePlan';
import {
  BRACKETS,
  isEscaped,
  isSpace,
  removeComments,
  scan,
  stops,
  templateReadsBalanced,
} from './reader';

/** A block statement ends at `;`, `{`, or `}`; its first top-level `:` splits a declaration. */
const STATEMENT = stops(':{;}');
/** {@link STATEMENT}, also stopping at a slot marker, for missing-`;` recovery. */
const STATEMENT_OR_SLOT = stops(':{;}\0');
/** An at-rule prelude, and the text after a recovering slot, end at `{`, `;`, or `}`. */
const PRELUDE = stops('{;}');
/** Entries of a selector, stop, or value list are separated by top-level commas. */
const LIST_COMMA = stops(',');

/** What the block being read holds; see {@link ParseContext.block}. */
const enum Block {
  /** Declarations, rules, and at-rules. */
  Rules = 0,
  /** The frame list of `@keyframes`: its rules are frames, their selectors the stops. */
  Frames = 1,
  /** A keyframe frame's body, where every Run at a statement start splices declarations. */
  Frame = 2,
}

export interface ParseOptions {
  /**
   * When `true`, the input is a frame list, read as the block of a
   * `@keyframes` rule is (a `keyframes` template); see {@link keyframesRule}.
   */
  frames?: boolean;
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

/** Per-slot knowledge shared between `parseSource` and the parser. */
export interface SlotTable {
  /**
   * Slots whose value is a client reference, which the server cannot
   * resolve; a head holding one is marked `unresolved`. `null` when none is.
   */
  clientRefs: ReadonlyArray<boolean> | null;
  /** Written by the parser: `true` for each slot it keeps, `false` for one removed with a comment or a dropped statement. */
  kept: boolean[];
  /**
   * Slots whose value ends a declaration missing its `;` when met in the
   * declaration's value; `null` when no slot can.
   */
  recover: ReadonlyArray<boolean> | null;
  /** Written by the parser: `true` for each slot whose value splices as statements (standalone and head slots). */
  standalone: boolean[];
}

const ALWAYS_READ_FLAG: PropertyDescriptor = { configurable: true, enumerable: false, value: true };

/**
 * Parse CSS text (template text, mixin text, or a static string) into a
 * parser AST. Comments are removed first, a slot marker inside one with it.
 */
export function parse(
  css: string,
  options: ParseOptions & { templates: true }
): Root<string | TemplateValue>;
export function parse(css: string, options?: ParseOptions): Root<string>;
export function parse(css: string, options?: ParseOptions): Root<string | TemplateValue> {
  const templates = !!options?.templates;
  const slots = templates && options?.slots !== undefined ? options.slots : null;
  const text = removeComments(css, true);
  const ctx: ParseContext = {
    block: options?.frames ? Block.Frames : Block.Rules,
    css: text,
    depth: 0,
    dyn: false,
    len: text.length,
    i: 0,
    recover: slots !== null ? slots.recover : null,
    slots,
    templates,
  };
  return parseBlock(ctx);
}

/**
 * A `@keyframes prelude` rule whose block is `frames`, a frame list parsed
 * with `frames: true`; `dynamic` when the list holds a slot.
 */
export function keyframesRule(prelude: string, frames: Root, dynamic: boolean): KeyframesNode {
  const node: KeyframesNode = {
    kind: NodeKind.Keyframes,
    name: 'keyframes',
    prelude,
    children: frames,
  };
  if (dynamic) markDyn(node);
  return node;
}

interface ParseContext {
  /** What the block being read holds. */
  block: Block;
  css: string;
  /** Blocks open around the reading position; a `}` read at 0 is stray. */
  depth: number;
  /**
   * Whether the node being read so far holds a slot: a {@link TemplateValue}
   * field, a head, or a splice. Saved and cleared around each node that
   * carries {@link DYN}, then merged back so it bubbles to the parent.
   */
  dyn: boolean;
  len: number;
  i: number;
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

function keepSlot(ctx: ParseContext, index: number): void {
  if (ctx.slots !== null) ctx.slots.kept[index] = true;
}

/** Keep a slot whose value splices as statements (a standalone or head slot). */
function keepSplice(ctx: ParseContext, index: number): void {
  ctx.dyn = true;
  if (ctx.slots !== null) {
    ctx.slots.kept[index] = true;
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
function statementRun(ctx: ParseContext, out: Node[], i: number): Run | null | false {
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
function pushRunSlots(ctx: ParseContext, out: Node[], run: Run, count: number): void {
  for (let k = 0; k < count; k++) pushSplice(ctx, out, run.slots[k]);
}

/**
 * Push a standalone splice of slot `index`. Tagged dynamic like every other
 * slot-bearing node so the fill's node reads see one shape per kind.
 */
function pushSplice(ctx: ParseContext, out: Node[], index: number): void {
  const node: InterpolationNode = { kind: NodeKind.Interpolation, index };
  markDyn(node);
  out.push(node);
  keepSplice(ctx, index);
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

/** {@link parseBlock} for a block holding `block` whose `{` was just read. */
function parseNested(ctx: ParseContext, block: Block): Node[] {
  const outer = ctx.block;
  ctx.block = block;
  ctx.depth++;
  const out = parseBlock(ctx);
  ctx.depth--;
  ctx.block = outer;
  return out;
}

/** Single-pass parse of a CSS block body. */
function parseBlock(ctx: ParseContext): Node[] {
  const css = ctx.css;
  const len = ctx.len;
  const out: Node[] = [];

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
      if (ctx.depth === 0) continue;
      return out;
    }

    if (first === AT) {
      ctx.i = i;
      const node = parseAtRule(ctx);
      if (node !== null) out.push(node);
      continue;
    }

    // A Run that is not Standalone is classified by the statement scan below:
    // a rule head when the statement ends in `{`, otherwise standalone slots
    // before a declaration.
    const run = first === NUL ? statementRun(ctx, out, i) : null;
    if (run === false) continue;
    if (run !== null) i = run.next === run.lastEnd ? run.lastStart : run.next;
    const start = i;

    let colon = -1;
    // `while (true)` (not `while (i < len)`) so that a COLON found at the
    // very last position can still reach the EOF branch on the next scan.
    while (true) {
      const stop = scan(css, i, len, ctx.recover === null ? STATEMENT : STATEMENT_OR_SLOT, 0, 0);
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
        if (
          end !== -1 &&
          recoversAt(ctx, stop, end, colon) &&
          css.charCodeAt(scan(css, end, len, PRELUDE, 0, 0)) !== OPEN_BRACE
        ) {
          const declStart = run === null ? start : leadDecl(ctx, out, run);
          pushDecl(ctx, out, declStart, colon, stop);
          pushSplice(ctx, out, slotIndex(css, stop, end));
          ctx.i = end;
          break;
        }
        i = end === -1 ? stop + 1 : end;
        continue;
      }
      if (c === OPEN_BRACE) {
        const selectorText = trimRange(css, start, stop);
        let lead =
          run === null ? 0 : run.next === run.lastEnd ? run.slots.length - 1 : run.slots.length;
        if (run !== null && ctx.block === Block.Frame) {
          pushRunSlots(ctx, out, run, lead);
          lead = 0;
        }
        ctx.i = stop + 1;
        const outerDyn = ctx.dyn;
        ctx.dyn = false;
        const block = ctx.block === Block.Frames ? Block.Frame : Block.Rules;
        let node: RuleNode;
        if (run !== null && lead > 0) {
          const head = runHead(ctx, run, lead, selectorText);
          node = { kind: NodeKind.Rule, selectors: [], children: parseNested(ctx, block), head };
        } else {
          const selectors =
            selectorText.indexOf(',') === -1
              ? [selectorText]
              : splitTopLevelCommas(selectorText, true);
          const children = parseNested(ctx, block);
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
        // A frame's selectors are stops, which the router never reads.
        if (__NATIVE__ && block !== Block.Frame) stampRuleClass(node);
        out.push(node);
        break;
      }
      // c is SEMICOLON or CLOSE_BRACE
      const declStart = run === null ? start : leadDecl(ctx, out, run);
      ctx.i = stop + 1;
      if (c === CLOSE_BRACE) {
        // At the top level the `}` is stray and drops its statement.
        if (ctx.depth === 0) break;
        if (colon !== -1) pushDecl(ctx, out, declStart, colon, stop);
        return out;
      }
      if (colon !== -1) pushDecl(ctx, out, declStart, colon, stop);
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
  const value = trimRange(ctx.css, colon + 1, end);
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
 * fields don't carry interpolations). A field whose template text does not
 * read balanced with plain text in its slots is marked {@link ALWAYS_READ}.
 *
 * Other `\0`-prefixed sequences (notably the createTheme.native.ts
 * `\0sc:` token namespace) ride through opaquely; they're preserved in
 * chunks and never become slot references.
 */
function templateOrString(ctx: ParseContext, s: string): string | TemplateValue {
  if (!ctx.templates) return s;
  let i = s.indexOf('\0');
  if (i === -1) return s;
  const len = s.length;
  let chunks: string[] | null = null;
  const slots: number[] = [];
  let last = 0;
  while (i !== -1) {
    const end = slotEnd(s, i, len);
    if (end === -1) {
      i = s.indexOf('\0', i + 1);
      continue;
    }
    if (chunks === null) chunks = [];
    chunks.push(s.substring(last, i));
    const index = slotIndex(s, i, end);
    slots.push(index);
    keepSlot(ctx, index);
    last = end;
    i = s.indexOf('\0', end);
  }
  if (chunks === null) return s;
  chunks.push(s.substring(last));
  ctx.dyn = true;
  const field: TemplateValue = { chunks, slots };
  if (!templateReadsBalanced(chunks)) Object.defineProperty(field, ALWAYS_READ, ALWAYS_READ_FLAG);
  return field;
}

/** A CSS custom property starts with `--` (two leading hyphens). */
export function isCustomProperty(prop: string): boolean {
  return prop.length > 2 && prop.charCodeAt(0) === HYPHEN && prop.charCodeAt(1) === HYPHEN;
}

/** `keyframes`, or a vendor-prefixed form such as `-webkit-keyframes`. */
export function isKeyframesName(name: string): boolean {
  return name === 'keyframes' || /^-[a-z]+-keyframes$/.test(name);
}

/**
 * `css[start..end]` without leading and trailing CSS whitespace, keeping a
 * trailing whitespace code point directly preceded by an escaping backslash:
 * removing it would leave the backslash escaping whatever is written next.
 */
export function trimRange(css: string, start: number, end: number): string {
  while (start < end && isSpace(css.charCodeAt(start))) start++;
  while (end > start && isSpace(css.charCodeAt(end - 1))) {
    if (css.charCodeAt(end - 2) === BACKSLASH && isEscaped(css, end - 1)) break;
    end--;
  }
  return start === 0 && end === css.length ? css : css.substring(start, end);
}

function isNameStop(code: number): boolean {
  return (
    isWS(code) ||
    code === OPEN_BRACE ||
    code === SEMICOLON ||
    code === CLOSE_BRACE ||
    code === OPEN_PAREN
  );
}

/** The at-rule at `ctx.i`; `null` when its statement ends at a stray `}` and is dropped. */
function parseAtRule(ctx: ParseContext): AtRuleNode | KeyframesNode | null {
  const outerDyn = ctx.dyn;
  ctx.dyn = false;
  const node = readAtRule(ctx);
  if (node !== null && ctx.dyn) markDyn(node);
  else ctx.dyn = outerDyn;
  return node;
}

function readAtRule(ctx: ParseContext): AtRuleNode | KeyframesNode | null {
  const css = ctx.css;
  const len = ctx.len;
  let j = ctx.i + 1;

  // Read the at-rule name up to whitespace, `{`, `;`, `}`, or `(`.
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
  j = scan(css, j, len, PRELUDE, 0, 0);

  // Past the end, `charCodeAt` is NaN: neither `{`, `;`, nor `}`.
  const delim = css.charCodeAt(j);
  if (delim === CLOSE_BRACE && ctx.depth === 0) {
    ctx.i = j + 1;
    return null;
  }
  const prelude = trimRange(css, preludeStart, j);
  const nameField = templateOrString(ctx, name);
  const preludeField = templateOrString(ctx, prelude);

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
    const children = parseNested(ctx, Block.Frames);
    return { kind: NodeKind.Keyframes, name, prelude: preludeField, children };
  }

  const children = parseNested(ctx, Block.Rules);
  const node: AtRuleNode = {
    kind: NodeKind.AtRule,
    name: nameField,
    prelude: preludeField,
    children,
  };
  if (__NATIVE__) stampAtClass(node);
  return node;
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
    const comma = scan(raw, i, len, LIST_COMMA, BRACKETS, 0);
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
