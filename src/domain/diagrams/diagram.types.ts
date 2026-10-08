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
