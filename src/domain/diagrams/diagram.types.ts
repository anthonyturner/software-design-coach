export const DIAGRAM_KINDS = [
  'system-context',
  'use-case',
  'domain-model',
  'module',
  'dependency',
  'first-vertical-slice',
] as const;

export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export interface DiagramDefinition {
  readonly title: string;
  /** What to do in the wizard to give the diagram something to draw. */
  readonly emptyText: string;
}

/** A diagram node that stands for a module: the id Mermaid draws it under, and the row it came from. */
export interface ModuleNode {
  readonly nodeId: string;
  readonly moduleId: string;
  readonly name: string;
}
