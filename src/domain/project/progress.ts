import { isNamed } from '../entity/entities';
import { workflowFor } from '../workflow/workflow';
import type { Question, Step } from '../workflow/workflow.types';
import { stepAnswers } from './project';
import type { Project } from './project.types';

export type StepState = 'done' | 'current' | 'in-progress' | 'not-started';

export interface JourneyStop {
  readonly stepId: string;
  readonly title: string;
  readonly number: number;
  readonly state: StepState;
}

/**
 * Where the user is along the workflow. The step they are on is `current` however far along it is;
 * every other step is `done` once all its required questions are answered, `in-progress` if only
 * some answer exists, and `not-started` otherwise.
 */
export function journeyOf(project: Project): readonly JourneyStop[] {
  return workflowFor(project.mode).steps.map((step, index) => ({
    stepId: step.id,
    title: step.title,
    number: index + 1,
    state: stateOf(project, step),
  }));
}

/** The required questions of a step that have no answer yet, in the order they are asked. */
export function openQuestions(project: Project, step: Step): readonly Question[] {
  return step.questions.filter((question) => !question.optional && !isAnswered(project, step, question));
}

function stateOf(project: Project, step: Step): StepState {
  if (step.id === project.currentStepId) {
    return 'current';
  }
  if (openQuestions(project, step).length === 0) {
    return 'done';
  }
  return step.questions.some((question) => isAnswered(project, step, question)) ? 'in-progress' : 'not-started';
}

function isAnswered(project: Project, step: Step, question: Question): boolean {
  if (question.kind === 'entity-list') {
    return project.entities[question.entity].some(isNamed);
  }
  const value = stepAnswers(project, step.id)[question.id];
  if (value === undefined) {
    return false;
  }
  if (question.kind === 'choice') {
    return question.options.some((option) => option.value === value);
  }
  return typeof value === 'string' ? value.trim() !== '' : value.some((item) => item.trim() !== '');
}
