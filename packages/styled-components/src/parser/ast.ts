export const enum NodeKind {
  Decl = 1,
  Rule = 2,
  AtRule = 3,
  Keyframes = 4,
  Interpolation = 5,
}

/**
 * Pre-split fill recipe for a string field that contains one or more
 * embedded interpolation slots (e.g. `${theme.fg}` inside a value).
 * Length invariant: `chunks.length === slots.length + 1`. Per-render
 * fill is `chunks[0] + filled[slots[0]] + chunks[1] + ...`.
 *
 * The flat `string` form remains the fast path for fields without
 * interpolations (the common case); a field is a TemplateValue only
 * when it actually contains slot references.
 */
export interface TemplateValue {
  chunks: string[];
  slots: number[];
}

/**
 * Parse-time eager flag set by `markDynamic` in `source.ts`: `true` when
 * the node, or any descendant, depends on a runtime interpolation slot.
 * Falsy means the subtree is structurally fixed across renders, so
 * consumers can return it by reference and skip the per-render fill walk.
 *
 * Symbol-keyed and set via `Object.defineProperty(..., { enumerable: false })`
 * so the flag is invisible to `Jest.toEqual` (which walks both
 * `Object.keys` and `Object.getOwnPropertySymbols`), `JSON.stringify`,
 * `Object.keys`, and `for..in`. V8 still inline-caches the hidden-class
 * slot for the read.
 */
export const DYN: unique symbol = Symbol('dyn');

/**
 * Parse-time native-plan classification slots, stamped by
 * `attachNativeClassifications` (`parser/nativePlan.ts`). Same Symbol-keyed
 * non-enumerable pattern as `DYN`: invisible to test fixtures, JSON
 * serialization, and `for..in`, but inline-cached by V8.
 *
 * Defined here (rather than in `nativePlan.ts`) so `RuleNode` /
 * `AtRuleNode` can reference them as field keys without nativePlan.ts
 * importing back from ast.ts.
 */
export const NATIVE_RULE_CLASS: unique symbol = Symbol('nativeRuleClass');
export const NATIVE_AT_CLASS: unique symbol = Symbol('nativeAtClass');

export type PseudoState = 'hover' | 'focus' | 'pressed' | 'disabled';

export type AttrOperator = '=' | '~=' | '|=' | '^=' | '$=' | '*=';

export interface ConditionalAttr {
  name: string;
  value?: string;
  /**
   * Attribute-selector operator. Defaults to `'='` (exact match) when
   * omitted. Listed so the render-time matcher dispatches the right
   * substring / list-contains / prefix-match logic.
   */
  operator?: AttrOperator;
  /**
   * Case-sensitivity flag. `'i'` forces ASCII case-insensitive matching;
   * `'s'` is the default (case-sensitive) and is left unset for size.
   * Only meaningful when `value` is set.
   */
  caseFlag?: 'i';
}

export interface AttrSelector {
  attrs: ConditionalAttr[];
  pseudo?: PseudoState;
}

/**
 * nth pseudo-class parsed representation. `pos = a*n + b` iterates
 * n = 0, 1, 2, …; the matcher uses 1-based position in the CSS sense.
 * `fromEnd` swaps the counting direction (`:nth-last-child`).
 * `ofType` restricts to same-target siblings (`:nth-of-type`).
 * `onlyChild` adds an extra gate of total siblings === 1 (or total
 * same-target siblings === 1 when combined with `ofType`).
 */
export interface NthSpec {
  a: number;
  b: number;
  fromEnd: boolean;
  ofType: boolean;
  onlyChild?: boolean;
  /**
   * Inner simple selector for `:nth-child(an+b of S)` and
   * `:nth-last-child(an+b of S)`. Same shape as `:has(<simple>)` inner;
   * the matcher counts the formula position among siblings that satisfy
   * this inner, not among all siblings.
   */
  of?: NthOfBranch;
}

export type NthOfBranch =
  | { kind: 'component'; id: string }
  | { kind: 'attr'; attr: ConditionalAttr };

export type NativeRuleClass =
  | { kind: 'pseudo'; pseudo: PseudoState; negate?: boolean }
  | { kind: 'pseudoFanOut'; pseudos: PseudoState[] }
  | { kind: 'attr'; selectors: AttrSelector[]; negate?: boolean }
  | {
      /**
       * Combinator selector against a referenced styled component.
       * `descendant` matches when `ancestorId` is anywhere on the
       * ParentContext.ancestors chain; `child` matches only when
       * ParentContext.parentId === ancestorId; `adjacent-sibling`
       * matches when ParentContext.prevSiblingId === ancestorId;
       * `general-sibling` matches when ancestorId is anywhere in
       * ParentContext.prevSiblings. Authored as `${StyledFoo} &`
       * (descendant), `${StyledFoo} > &` (child), `${StyledFoo} + &`
       * (adjacent), `${StyledFoo} ~ &` (general).
       */
      kind: 'combinator';
      combinator: 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';
      ancestorId: string;
      /** Optional `:hover` / `:focus` / etc. carried on `&`. */
      pseudo?: PseudoState;
      negate?: boolean;
    }
  | {
      /**
       * Tree-structural pseudo (`&:nth-child(an+b)`, `&:first-child`,
       * `&:last-child`, `&:only-child`, `&:nth-of-type`, etc.). Match
       * runs against ParentContext.siblingIndex / totalSiblings /
       * siblingIndexOfType per `spec`.
       */
      kind: 'nthChild';
      spec: NthSpec;
      /** Optional pseudo-state appended after the nth pseudo
       *  (`&:first-child:hover`). */
      pseudo?: PseudoState;
      negate?: boolean;
    }
  | {
      /**
       * `&:has(<simple>)`. The match fires when the styled component
       * has a descendant in its own `children` subtree that satisfies
       * the inner simple selector. Two inner forms are supported on
       * native:
       *  - `&:has(${Component})`: any descendant whose `type` is the
       *    referenced styled component.
       *  - `&:has([attr])` / `&:has([attr='value'])`: any descendant
       *    whose props expose the named prop (with optional
       *    string-equality value match).
       */
      kind: 'has';
      inner: { kind: 'component'; id: string } | { kind: 'attr'; attr: ConditionalAttr };
      pseudo?: PseudoState;
      negate?: boolean;
    }
  | { kind: 'unsupported' };

export type NativeAtClass =
  | {
      kind: 'media' | 'container' | 'supports';
      containerName: string | undefined;
      condition: string | null;
    }
  | { kind: 'starting-style' }
  | { kind: 'keyframes' }
  | { kind: 'property' }
  | { kind: 'unsupported'; warn: 'web-only' | 'unknown' };

/**
 * AST node interfaces are generic over the string-field type `F`. Two
 * usages:
 *
 * - `Root<string | TemplateValue>` (default, alias `Root`): the
 *   parse-time AST. `templateOrString` in `parser.ts` produces
 *   {@link TemplateValue} for fields containing interpolations.
 * - `Root<string>` (alias `StaticRoot`): post-`fillAst` ASTs and ASTs
 *   from non-templated `parse(rawCss)` calls. Every string field is a
 *   plain string. emit-web and compileNative consume this.
 *
 * `fillAst` is the bridge: input `Root`, output `StaticRoot | null`.
 */
export interface DeclNode<F = string | TemplateValue> {
  kind: NodeKind.Decl;
  prop: F;
  value: F;
  [DYN]?: boolean;
}

export interface RuleNode<F = string | TemplateValue> {
  kind: NodeKind.Rule;
  selectors: F[];
  children: Node<F>[];
  [DYN]?: boolean;
  /**
   * Parse-time native-plan classification. Stamped by `stampRuleClass`
   * (parser/nativePlan.ts) on native builds at construction time.
   * Symbol-keyed and non-enumerable so test fixtures and JSON
   * serialization see the original AST shape. Absent when any selector
   * is a TemplateValue at construction time; the render path then
   * re-classifies on the filled selectors.
   */
  [NATIVE_RULE_CLASS]?: NativeRuleClass;
}

export interface AtRuleNode<F = string | TemplateValue> {
  kind: NodeKind.AtRule;
  name: F;
  prelude: F;
  children: Node<F>[] | null;
  [DYN]?: boolean;
  /**
   * Parse-time native-plan classification. Stamped by `stampAtClass`
   * on native builds at construction time. `condition` inside the
   * value is `null` when the prelude is a TemplateValue.
   */
  [NATIVE_AT_CLASS]?: NativeAtClass;
}

export interface KeyframeFrame<F = string | TemplateValue> {
  stops: F[];
  children: DeclNode<F>[];
}

export interface KeyframesNode<F = string | TemplateValue> {
  kind: NodeKind.Keyframes;
  name: F;
  prelude: F;
  frames: KeyframeFrame<F>[];
  [DYN]?: boolean;
}

/**
 * Block-level interpolation. Occupies the same position as Decl/Rule/AtRule
 * siblings. `interpolations[index]` is evaluated at render time and spliced
 * in. Interpolations whose evaluation produces CSS subtrees (`css\`...\``-style
 * fragments, conditional blocks) live here; value-position interpolations
 * inside decls become {@link TemplateValue} on the parent's `value` field.
 */
export interface InterpolationNode {
  kind: NodeKind.Interpolation;
  index: number;
}

export type Node<F = string | TemplateValue> =
  | DeclNode<F>
  | RuleNode<F>
  | AtRuleNode<F>
  | KeyframesNode<F>
  | InterpolationNode;

export type Root<F = string | TemplateValue> = Node<F>[];

/** Post-fillAst AST: every string field is a plain string. */
export type StaticRoot = Root<string>;
export type StaticNode = Node<string>;
export type StaticDeclNode = DeclNode<string>;
export type StaticRuleNode = RuleNode<string>;
export type StaticAtRuleNode = AtRuleNode<string>;
export type StaticKeyframesNode = KeyframesNode<string>;
export type StaticKeyframeFrame = KeyframeFrame<string>;
