import { isRecord } from '../record';
import { findStep, isProjectMode, workflowFor } from '../workflow/workflow';
import { SCHEMA_VERSION } from './project';
import type { AnswerValue, Project, StepAnswers } from './project.types';

/** A project as read back from storage: it names itself and its schema, and nothing else is trusted yet. */
export interface StoredProject {
  readonly id: string;
  readonly schemaVersion: number;
  readonly [field: string]: unknown;
}

export function isStoredProject(value: unknown): value is StoredProject {
  return isRecord(value) && typeof value['id'] === 'string' && typeof value['schemaVersion'] === 'number';
}

/**
 * The one place a stored project becomes a `Project`. A change to the persisted shape bumps
 * `SCHEMA_VERSION` and adds a step here that lifts the older shape (ADR-0008); until then there is
 * no older shape, so anything but the current version is refused.
 */
export function migrateProject(stored: StoredProject): Project | undefined {
  if (stored.schemaVersion !== SCHEMA_VERSION) {
    return undefined;
  }
  const { name, mode, answers, currentStepId, createdAt, updatedAt } = stored;
  if (
    typeof name !== 'string' ||
    !isProjectMode(mode) ||
    !isAnswers(answers) ||
    typeof currentStepId !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    return undefined;
  }
  const knownStep = findStep(workflowFor(mode), currentStepId);
  return {
    schemaVersion: SCHEMA_VERSION,
    id: stored.id,
    name,
    mode,
    answers,
    currentStepId: knownStep ? currentStepId : workflowFor(mode).steps[0].id,
    createdAt,
    updatedAt,
  };
}

function isAnswers(value: unknown): value is Readonly<Record<string, StepAnswers>> {
  return isRecord(value) && Object.values(value).every(isStepAnswers);
}

function isStepAnswers(value: unknown): value is StepAnswers {
  return isRecord(value) && Object.values(value).every(isAnswerValue);
}

function isAnswerValue(value: unknown): value is AnswerValue {
  return typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}
