import type { DiagramKind } from '../diagrams/diagram.types';
import type { EntityKind } from '../entity/entity.types';

export const PROJECT_MODES = ['new-project', 'feature-change'] as const;

export type ProjectMode = (typeof PROJECT_MODES)[number];

export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
  /** A sentence under the label that says what picking it means, for an option that needs more than its name. */
  readonly detail?: string;
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
  /**
   * Marks the step where the first slice is chosen and traced, and names the questions that hold the
   * chosen use case and the traced path. The first-slice diagram reads the answers from them.
   */
  readonly slice?: { readonly useCase: string; readonly path: string };
}

/** One Markdown file of the exported design package, and the steps whose answers it gathers. */
export interface PackageFileDefinition {
  readonly path: string;
  /** The file's heading and its name in the combined document's contents. */
  readonly title: string;
  readonly steps: readonly string[];
}

export interface Workflow {
  readonly mode: ProjectMode;
  readonly title: string;
  /** What the workflow is for, in a sentence: how a user tells it apart from the others when choosing. */
  readonly summary: string;
  readonly steps: readonly Step[];
  /** How the steps are gathered into the files of the exported package: each step in exactly one file, in workflow order. */
  readonly designPackage: readonly PackageFileDefinition[];
}
