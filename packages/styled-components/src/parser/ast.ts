export const enum NodeKind {
  Decl = 1,
  Rule = 2,
  AtRule = 3,
  Keyframes = 4,
  Interpolation = 5,
}

export interface DeclNode {
  kind: NodeKind.Decl;
  prop: string;
  value: string;
}

export interface RuleNode {
  kind: NodeKind.Rule;
  selectors: string[];
  children: Node[];
}

export interface AtRuleNode {
  kind: NodeKind.AtRule;
  name: string;
  prelude: string;
  children: Node[] | null;
}

export interface KeyframeFrame {
  stops: string[];
  children: DeclNode[];
}

export interface KeyframesNode {
  kind: NodeKind.Keyframes;
  name: string;
  prelude: string;
  frames: KeyframeFrame[];
}

/**
 * Block-level interpolation. Occupies the same position as Decl/Rule/AtRule
 * siblings. `interpolations[index]` is evaluated at render time and spliced
 * in. Interpolations whose evaluation produces CSS subtrees (`css\`...\``-style
 * fragments, conditional blocks) live here; value-position interpolations
 * inside decls remain as `\0I<index>\0` sentinels in the parent decl's `value`
 * string.
 */
export interface InterpolationNode {
  kind: NodeKind.Interpolation;
  index: number;
}

export type Node = DeclNode | RuleNode | AtRuleNode | KeyframesNode | InterpolationNode;

export type Root = Node[];
