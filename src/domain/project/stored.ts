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
  2: fromSchema2,
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
 * Schema 1 kept the roles listed under Users, and one free-text "needs" answer for all of them,
 * among the answers. Schema 2 keeps roles as actor rows with their own `needs`, so each role becomes
 * an actor, and the old text moves onto the first actor (an unnamed one if there were no roles)
 * instead of being left behind where no question reads it.
 */
function fromSchema1(stored: StoredProject): StoredProject {
  const { answers } = stored;
  const users = isRecord(answers) ? answers['users'] : undefined;
  if (!isRecord(answers) || !isRecord(users)) {
    return { ...stored, schemaVersion: 2, entities: {} };
  }
  const roles: unknown = users['users'];
  const names = Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === 'string' && role.trim() !== '').map((role) => role.trim())
    : [];
  const needs = typeof users['needs'] === 'string' ? users['needs'] : undefined;
  if (needs !== undefined && needs.trim() !== '' && names.length === 0) {
    names.push('');
  }
  const actors = names.map((name, index) => ({
    id: `actor-${index + 1}`,
    name,
    fields: { needs: index === 0 && needs !== undefined ? needs.trim() : '' },
  }));
  const kept = Object.entries(users).filter(([question]) => question !== 'users' && !(question === 'needs' && needs !== undefined));
  return { ...stored, schemaVersion: 2, answers: { ...answers, users: Object.fromEntries(kept) }, entities: { actor: actors } };
}

/**
 * Schema 3 gives a module a list of responsibilities, hidden knowledge, an interface sketch and the
 * modules it depends on. Modules saved before had only a purpose, so each gains the rest, empty.
 */
function fromSchema2(stored: StoredProject): StoredProject {
  const { entities } = stored;
  const modules = isRecord(entities) ? entities['module'] : undefined;
  if (!isRecord(entities) || !Array.isArray(modules)) {
    return { ...stored, schemaVersion: 3 };
  }
  return { ...stored, schemaVersion: 3, entities: { ...entities, module: modules.map(withModuleDetails) } };
}

function withModuleDetails(row: unknown): unknown {
  if (!isRecord(row) || !isRecord(row['fields'])) {
    return row;
  }
  return { ...row, fields: { responsibilities: [], hides: '', interface: '', dependsOn: [], ...row['fields'] } };
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
