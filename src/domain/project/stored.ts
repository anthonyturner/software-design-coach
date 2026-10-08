import { emptyEntities } from '../entity/entities';
import { ENTITY_KINDS } from '../entity/entity.types';
import type { Entity, EntityKind, ProjectEntities } from '../entity/entity.types';
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

const upgrades: Readonly<Record<number, (stored: StoredProject) => StoredProject>> = {
  1: fromSchema1,
};

/**
 * The one place a stored project becomes a `Project`. A change to the persisted shape bumps
 * `SCHEMA_VERSION` and adds an entry to `upgrades` that lifts the previous shape (ADR-0008). A
 * version this build has no way to read, older or newer, is refused rather than guessed at.
 */
export function migrateProject(stored: StoredProject): Project | undefined {
  const current = upgrade(stored);
  if (!current) {
    return undefined;
  }
  const { name, mode, answers, entities, currentStepId, createdAt, updatedAt } = current;
  const parsedEntities = parseEntities(entities);
  if (
    typeof name !== 'string' ||
    !isProjectMode(mode) ||
    !isAnswers(answers) ||
    !parsedEntities ||
    typeof currentStepId !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    return undefined;
  }
  const knownStep = findStep(workflowFor(mode), currentStepId);
  return {
    schemaVersion: SCHEMA_VERSION,
    id: current.id,
    name,
    mode,
    answers,
    entities: parsedEntities,
    currentStepId: knownStep ? currentStepId : workflowFor(mode).steps[0].id,
    createdAt,
    updatedAt,
  };
}

function upgrade(stored: StoredProject): StoredProject | undefined {
  let current = stored;
  while (current.schemaVersion < SCHEMA_VERSION) {
    const step = upgrades[current.schemaVersion];
    if (!step) {
      return undefined;
    }
    current = step(current);
  }
  return current.schemaVersion === SCHEMA_VERSION ? current : undefined;
}

/**
 * Schema 1 kept the roles listed under Users as a list of strings among the answers. Schema 2 keeps
 * them as actor rows, so each role becomes an actor and is no longer stored as an answer.
 */
function fromSchema1(stored: StoredProject): StoredProject {
  const { answers } = stored;
  const users = isRecord(answers) ? answers['users'] : undefined;
  const roles = isRecord(users) ? users['users'] : undefined;
  if (!isRecord(answers) || !isRecord(users) || !Array.isArray(roles)) {
    return { ...stored, schemaVersion: 2, entities: {} };
  }
  const otherUserAnswers = Object.fromEntries(Object.entries(users).filter(([question]) => question !== 'users'));
  const actors = roles
    .filter((role): role is string => typeof role === 'string' && role.trim() !== '')
    .map((role, index) => ({ id: `actor-${index + 1}`, name: role.trim(), fields: { needs: '' } }));
  return { ...stored, schemaVersion: 2, answers: { ...answers, users: otherUserAnswers }, entities: { actor: actors } };
}

function parseEntities(value: unknown): ProjectEntities | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const parsed: Record<EntityKind, readonly Entity[]> = { ...emptyEntities() };
  for (const kind of ENTITY_KINDS) {
    const rows = value[kind];
    if (rows === undefined) {
      continue;
    }
    if (!Array.isArray(rows) || !rows.every(isEntity)) {
      return undefined;
    }
    parsed[kind] = rows;
  }
  return parsed;
}

function isEntity(value: unknown): value is Entity {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    isRecord(value['fields']) &&
    Object.values(value['fields']).every(isAnswerValue)
  );
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
