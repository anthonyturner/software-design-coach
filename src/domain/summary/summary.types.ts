import type { DiagramKind } from '../diagrams/diagram.types';

/** A written value as the summary shows it: a paragraph, or the lines of a list. */
export type SummaryValue =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'list'; readonly items: readonly string[] };

export interface SummaryField {
  readonly label: string;
  readonly value: SummaryValue;
}

/** One named row of an entity list, with the fields that have something written in them. */
export interface SummaryRow {
  readonly name: string;
  readonly fields: readonly SummaryField[];
}

/** One value for each of several rows, as an entity-fields question asks for. */
export interface SummaryEntry {
  readonly name: string;
  readonly value: SummaryValue;
}

export type SummaryAnswerBody =
  | SummaryValue
  | { readonly kind: 'rows'; readonly rows: readonly SummaryRow[] }
  | { readonly kind: 'entries'; readonly entries: readonly SummaryEntry[] };

export interface SummaryAnswer {
  readonly questionId: string;
  readonly prompt: string;
  readonly body: SummaryAnswerBody;
}

export interface SummaryDiagram {
  readonly kind: DiagramKind;
  readonly title: string;
  readonly source: string;
}

export interface SummaryStep {
  readonly stepId: string;
  readonly number: number;
  readonly title: string;
  /** `answered` once every required question has an answer; otherwise `open`, whatever else is written. */
  readonly state: 'answered' | 'open';
  /** The required questions still without an answer, as they are asked. */
  readonly openPrompts: readonly string[];
  /** What has been answered, in the order the questions are asked; a question with no answer is left out. */
  readonly answers: readonly SummaryAnswer[];
  /** The user's note on the step, as typed, or the empty string. */
  readonly note: string;
  /** The step's diagram when the model has something to draw in it. */
  readonly diagram: SummaryDiagram | undefined;
}

export interface DesignSummary {
  readonly projectName: string;
  readonly workflowTitle: string;
  readonly answeredCount: number;
  readonly stepCount: number;
  readonly steps: readonly SummaryStep[];
}
