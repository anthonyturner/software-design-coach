import { featureChangeWorkflow } from './feature-change.workflow';
import { newProjectWorkflow } from './new-project.workflow';
import type { ProjectMode, Question, Step, Workflow } from './workflow.types';

const workflows: Readonly<Record<ProjectMode, Workflow>> = {
  'new-project': newProjectWorkflow,
  'feature-change': featureChangeWorkflow,
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

/** Where a workflow has the user choose and trace the first slice, if it has such a step. */
export function findSlice(
  workflow: Workflow,
): { readonly stepId: string; readonly useCase: string; readonly path: string } | undefined {
  const step = workflow.steps.find((candidate) => candidate.slice !== undefined);
  return step?.slice && { stepId: step.id, ...step.slice };
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
