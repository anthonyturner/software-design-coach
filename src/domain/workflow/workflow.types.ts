import type { DiagramKind } from '../diagrams/diagram.types';
import type { EntityKind } from '../entity/entity.types';

export type ProjectMode = 'new-project';

export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
}

interface QuestionBase {
  readonly id: string;
  readonly prompt: string;
  readonly hint?: string;
  /** A step is done when every question not marked optional is answered. */
  readonly optional?: true;
}

export interface TextQuestion extends QuestionBase {
  readonly kind: 'short-text' | 'long-text' | 'string-list';
}

export interface ChoiceQuestion extends QuestionBase {
  readonly kind: 'choice';
  readonly options: readonly ChoiceOption[];
}

/**
 * The answer is the project's list of `entity` rows, edited in place rather than stored with the
 * answers. It edits `fields` of each row (all of them when omitted), and counts as answered once
 * `minimum` rows (one when omitted) are named.
 */
export interface EntityListQuestion extends QuestionBase {
  readonly kind: 'entity-list';
  readonly entity: EntityKind;
  readonly fields?: readonly string[];
  readonly minimum?: number;
}

/** Edits one `field` of every row already listed for `entity`; it adds and removes no rows. */
export interface EntityFieldsQuestion extends QuestionBase {
  readonly kind: 'entity-fields';
  readonly entity: EntityKind;
  readonly field: string;
  /** When set, the user may tick this instead of filling the field in, to say that no row has anything to list. */
  readonly noneLabel?: string;
}

/** The answer is the id of one named `entity` row, kept with the answers and dropped if the row is removed. */
export interface EntityChoiceQuestion extends QuestionBase {
  readonly kind: 'entity-choice';
  readonly entity: EntityKind;
}

export type Question =
  | TextQuestion
  | ChoiceQuestion
  | EntityListQuestion
  | EntityFieldsQuestion
  | EntityChoiceQuestion;

export type AnswerKind = Question['kind'];

export interface Step {
  readonly id: string;
  readonly title: string;
  /** One or two sentences that frame the step; the longer reasoning is `why`. */
  readonly think: string;
  readonly why: string;
  readonly questions: readonly Question[];
  readonly example: string;
  readonly challenges: readonly string[];
  /** The diagram drawn beside the step, from the model as it stands; a step that shows none leaves this out. */
  readonly diagram?: DiagramKind;
}

export interface Workflow {
  readonly mode: ProjectMode;
  readonly title: string;
  readonly steps: readonly Step[];
}
