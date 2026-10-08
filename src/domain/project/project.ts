import { emptyEntities, withEditedEntity, withEntity, withMovedEntity, withoutEntity } from '../entity/entities';
import type { EntityEdit, EntityKind, ProjectEntities } from '../entity/entity.types';
import { isRecord } from '../record';
import { findQuestion, findStep, isProjectMode, workflowFor } from '../workflow/workflow';
import type { ProjectMode, Question } from '../workflow/workflow.types';
import type { AnswerValue, Project, ProjectSummary, StepAnswers } from './project.types';

export const SCHEMA_VERSION = 2;

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
    entities: emptyEntities(),
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

export function addEntity(project: Project, kind: EntityKind, id: string, now: string): Project {
  return withEntities(project, withEntity(project.entities, kind, id), now);
}

export function updateEntity(project: Project, kind: EntityKind, id: string, edit: EntityEdit, now: string): Project {
  return withEntities(project, withEditedEntity(project.entities, kind, id, edit), now);
}

/** Moves a row up (negative offset) or down (positive) among the rows of its kind. */
export function moveEntity(project: Project, kind: EntityKind, id: string, offset: number, now: string): Project {
  return withEntities(project, withMovedEntity(project.entities, kind, id, offset), now);
}

/** Removes a row and, with it, every reference to it from other rows. */
export function removeEntity(project: Project, kind: EntityKind, id: string, now: string): Project {
  return withEntities(project, withoutEntity(project.entities, kind, id), now);
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

function withEntities(project: Project, entities: ProjectEntities, now: string): Project {
  return entities === project.entities ? project : { ...project, entities, updatedAt: now };
}

function fits(question: Question, value: AnswerValue): boolean {
  switch (question.kind) {
    case 'short-text':
    case 'long-text':
      return typeof value === 'string';
    case 'string-list':
      return typeof value !== 'string';
    case 'choice':
      return typeof value === 'string' && question.options.some((option) => option.value === value);
    case 'entity-list':
      return false;
  }
}
