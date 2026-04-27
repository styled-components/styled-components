export const enum NodeKind {
  Decl = 1,
  Rule = 2,
  AtRule = 3,
  Keyframes = 4,
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

export type Node = DeclNode | RuleNode | AtRuleNode | KeyframesNode;

export type Root = Node[];
