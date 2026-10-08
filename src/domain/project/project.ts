import { isRecord } from '../record';
import { findQuestion, findStep, isProjectMode, workflowFor } from '../workflow/workflow';
import type { ProjectMode, Question } from '../workflow/workflow.types';
import type { AnswerValue, Project, ProjectSummary, StepAnswers } from './project.types';

export const SCHEMA_VERSION = 1;

const UNTITLED = 'Untitled project';
const NO_ANSWERS: StepAnswers = Object.freeze({});

export function createProject(input: {
  readonly id: string;
  readonly name: string;
  readonly mode: ProjectMode;
  readonly now: string;
}): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: input.id,
    name: input.name.trim() || UNTITLED,
    mode: input.mode,
    answers: {},
    currentStepId: workflowFor(input.mode).steps[0].id,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function answer(
  project: Project,
  stepId: string,
  questionId: string,
  value: AnswerValue,
  now: string,
): Project {
  const question = findQuestion(workflowFor(project.mode), stepId, questionId);
  if (!question || !fits(question, value)) {
    return project;
  }
  return {
    ...project,
    answers: { ...project.answers, [stepId]: { ...stepAnswers(project, stepId), [questionId]: value } },
    updatedAt: now,
  };
}

export function goTo(project: Project, stepId: string, now: string): Project {
  if (!findStep(workflowFor(project.mode), stepId)) {
    return project;
  }
  return { ...project, currentStepId: stepId, updatedAt: now };
}

export function stepAnswers(project: Project, stepId: string): StepAnswers {
  return project.answers[stepId] ?? NO_ANSWERS;
}

export function summarize(project: Project): ProjectSummary {
  return { id: project.id, name: project.name, mode: project.mode, updatedAt: project.updatedAt };
}

export function isProjectSummary(value: unknown): value is ProjectSummary {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    isProjectMode(value['mode']) &&
    typeof value['updatedAt'] === 'string'
  );
}

function fits(question: Question, value: AnswerValue): boolean {
  return question.kind === 'string-list' ? typeof value !== 'string' : typeof value === 'string';
}
