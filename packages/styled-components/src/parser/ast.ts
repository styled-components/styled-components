export const enum NodeKind {
  Decl = 1,
  Rule = 2,
  AtRule = 3,
  Interpolation = 4,
}

/**
 * Pre-classified slot shape so the fast path skips typeof checks. Order
 * matches hot-path likelihood (`StatelessFn` first). A `Source` packs the kind
 * in the bits of `Mask` and flags a block-position slot with `Standalone`.
 *
 * - `StatelessFn`: `(p) => …`; call and coerce.
 * - `Static`: primitive baked at construction (`${10}px`); also styled-
 *   component refs (pre-stringified to `.${styledComponentId}`) and, in a
 *   server build, client and temporary references (their marker text).
 * - `General`: arrays, plain objects, and `${kf}` refs; full walk, bail on
 *   shapes the fast emitter doesn't cover. A keyframes ref resolves here at
 *   fill time since its hashed name varies per StyleSheetManager.
 * - `Fragment`: `${mixin}` ref; resolved recursively into FastPathFragment.
 * - `Standalone`: set by the parser on a slot that is a whole statement (lifted to an
 *   `InterpolationNode` and spliced as siblings at fill time); other slots are embedded in
 *   a value, selector, or prelude.
 */
export const enum InterpolationKind {
  StatelessFn = 1,
  Static = 2,
  General = 3,
  Fragment = 4,
  Mask = 7,
  Standalone = 8,
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
  /** @internal */
  chunks: string[];
  /** @internal */
  slots: number[];
}

export type PseudoState =
  | 'hover'
  | 'focus'
  | 'pressed'
  | 'disabled'
  | 'enabled'
  | 'readOnly'
  | 'readWrite';

/** One further pseudo-class of a compound such as `&:hover:not(:disabled)`; all terms must hold. */
export interface PseudoTerm {
  negate: boolean;
  pseudo: PseudoState;
}

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
  /** The attribute sits in `:not()` (`&:hover:not([x])`): it holds when the selector does not match. */
  negate?: true;
}

export interface AttrSelector {
  /** The pseudo-class terms after `pseudo` in `&[x]:hover:not(:disabled)`; each must also hold. */
  and?: PseudoTerm[];
  attrs: ConditionalAttr[];
  pseudo?: PseudoState;
  /** `pseudo` is wrapped in `:not()`. */
  pseudoNegate?: boolean;
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

/**
 * A selector list judged member by member: `members[i]` classifies the i-th selector of the rule, so
 * an `unsupported` member is skipped without dropping the others.
 */
export type NativeRuleClass =
  | NativeSelectorClass
  | {
      kind: 'list';
      /** @internal */
      members: NativeSelectorClass[];
    };

/** The classification of one selector (a list member, or a rule's only selector). */
export type NativeSelectorClass =
  | { and?: PseudoTerm[]; kind: 'pseudo'; negate?: boolean; pseudo: PseudoState }
  | {
      kind: 'pseudoFanOut';
      /** @internal */
      pseudos: PseudoState[];
    }
  | {
      kind: 'attr';
      /** @internal */
      selectors: AttrSelector[];
    }
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
      /** @internal */
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
      /** @internal */
      spec: NthSpec;
      /** The pseudo-class terms after `pseudo` (`&:first-child:hover:not(:disabled)`). */
      and?: PseudoTerm[];
      /** Optional pseudo-state appended after the nth pseudo
       *  (`&:first-child:hover`). */
      pseudo?: PseudoState;
      negate?: boolean;
      /** `pseudo` is wrapped in `:not()`. */
      pseudoNegate?: boolean;
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
      condition: string;
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
 * `fillAst` is the bridge: input `Root`, output `StaticRoot`.
 */
export interface DeclNode<F = string | TemplateValue> {
  /**
   * `true` when the node or a descendant depends on a runtime interpolation slot; omitted on a
   * static subtree, which consumers return by reference and skip filling.
   * @internal
   */
  dyn?: true;
  kind: NodeKind.Decl;
  prop: F;
  value: F;
}

export interface RuleNode<F = string | TemplateValue> {
  children: Node<F>[];
  /** @internal */
  dyn?: true;
  kind: NodeKind.Rule;
  /** @internal */
  selectors: F[];
}

/**
 * `@keyframes` is an at-rule like any other: its `children` are the frames, each a
 * {@link RuleNode} whose `selectors` are the stops and whose `children` are the declarations.
 */
export interface AtRuleNode<F = string | TemplateValue> {
  children: Node<F>[] | null;
  /** @internal */
  dyn?: true;
  kind: NodeKind.AtRule;
  name: F;
  /** @internal */
  prelude: F;
}

/**
 * Block-level interpolation. Occupies the same position as Decl/Rule/AtRule
 * siblings. `interpolations[index]` is evaluated at render time and spliced
 * in. Interpolations whose evaluation produces CSS subtrees (`css\`...\``-style
 * fragments, conditional blocks) live here; value-position interpolations
 * inside decls become {@link TemplateValue} on the parent's `value` field.
 */
export interface InterpolationNode {
  /**
   * Always set: a slot reads `filled` at render time.
   * @internal
   */
  dyn: true;
  /** A `;` follows the slot in the template, so it cannot start the rule after it. */
  ended?: true;
  index: number;
  kind: NodeKind.Interpolation;
}

export type Node<F = string | TemplateValue> =
  | DeclNode<F>
  | RuleNode<F>
  | AtRuleNode<F>
  | ([F] extends [string] ? never : InterpolationNode);

export type Root<F = string | TemplateValue> = Node<F>[];

/** Post-fillAst AST: every string field is a plain string, with no interpolation nodes. */
export type StaticRoot = Root<string>;
export type StaticNode = DeclNode<string> | RuleNode<string> | AtRuleNode<string>;
export type StaticDeclNode = DeclNode<string>;
export type StaticRuleNode = RuleNode<string>;
export type StaticAtRuleNode = AtRuleNode<string>;
