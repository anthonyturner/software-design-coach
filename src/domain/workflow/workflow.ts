import { newProjectWorkflow } from './new-project.workflow';
import type { ProjectMode, Question, Step, Workflow } from './workflow.types';

const workflows: Readonly<Record<ProjectMode, Workflow>> = {
  'new-project': newProjectWorkflow,
};

export function workflowFor(mode: ProjectMode): Workflow {
  return workflows[mode];
}

export function findStep(workflow: Workflow, stepId: string): Step | undefined {
  return workflow.steps.find((step) => step.id === stepId);
}

export function findQuestion(workflow: Workflow, stepId: string, questionId: string): Question | undefined {
  return findStep(workflow, stepId)?.questions.find((question) => question.id === questionId);
}

export function adjacentSteps(
  workflow: Workflow,
  stepId: string,
): { readonly previous: Step | undefined; readonly next: Step | undefined } {
  const index = workflow.steps.findIndex((step) => step.id === stepId);
  if (index < 0) {
    return { previous: undefined, next: undefined };
  }
  return { previous: workflow.steps[index - 1], next: workflow.steps[index + 1] };
}

export function isProjectMode(value: unknown): value is ProjectMode {
  return typeof value === 'string' && Object.hasOwn(workflows, value);
}
