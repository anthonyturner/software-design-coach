export type ProjectMode = 'new-project';

export type AnswerKind = 'short-text' | 'long-text' | 'string-list';

export interface Question {
  readonly id: string;
  readonly prompt: string;
  readonly kind: AnswerKind;
  readonly hint?: string;
}

export interface Step {
  readonly id: string;
  readonly title: string;
  readonly why: string;
  readonly questions: readonly Question[];
  readonly example: string;
  readonly challenges: readonly string[];
}

export interface Workflow {
  readonly mode: ProjectMode;
  readonly title: string;
  readonly steps: readonly Step[];
}
