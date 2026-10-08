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

/** The answer is the project's list of `entity` rows, edited in place rather than stored with the answers. */
export interface EntityListQuestion extends QuestionBase {
  readonly kind: 'entity-list';
  readonly entity: EntityKind;
}

export type Question = TextQuestion | ChoiceQuestion | EntityListQuestion;

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
}

export interface Workflow {
  readonly mode: ProjectMode;
  readonly title: string;
  readonly steps: readonly Step[];
}
