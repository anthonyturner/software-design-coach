import { entityDefinitions } from './entity-definitions';
import { ENTITY_KINDS } from './entity.types';
import type { Entity, EntityEdit, EntityField, EntityKind, FieldValue, ProjectEntities } from './entity.types';

/**
 * Every operation returns the very object it was given when it changes nothing, so callers can
 * tell "no change" with `===`. Ids, not names, tie entities together: a rename touches no reference,
 * and removing an entity takes its id out of every reference to it, so a reference can never dangle.
 */

export function emptyEntities(): ProjectEntities {
  return { actor: [], 'use-case': [], concept: [], 'external-system': [], module: [] };
}

export function withEntity(entities: ProjectEntities, kind: EntityKind, id: string): ProjectEntities {
  if (entities[kind].some((entity) => entity.id === id)) {
    return entities;
  }
  const fields = Object.fromEntries(entityDefinitions[kind].fields.map((field) => [field.key, emptyValue(field)]));
  return replaceKind(entities, kind, [...entities[kind], { id, name: '', fields }]);
}

export function withEditedEntity(
  entities: ProjectEntities,
  kind: EntityKind,
  id: string,
  edit: EntityEdit,
): ProjectEntities {
  const list = entities[kind];
  const entity = list.find((found) => found.id === id);
  if (!entity) {
    return entities;
  }
  const edited = applyEdit(entities, kind, entity, edit);
  return edited === entity ? entities : replaceKind(entities, kind, list.map((found) => (found === entity ? edited : found)));
}

export function withMovedEntity(entities: ProjectEntities, kind: EntityKind, id: string, offset: number): ProjectEntities {
  const list = entities[kind];
  const from = list.findIndex((entity) => entity.id === id);
  const to = Math.min(Math.max(from + offset, 0), list.length - 1);
  if (from < 0 || to === from) {
    return entities;
  }
  const reordered = list.filter((_, index) => index !== from);
  reordered.splice(to, 0, list[from]);
  return replaceKind(entities, kind, reordered);
}

export function withoutEntity(entities: ProjectEntities, kind: EntityKind, id: string): ProjectEntities {
  if (!entities[kind].some((entity) => entity.id === id)) {
    return entities;
  }
  const next: Record<EntityKind, readonly Entity[]> = { ...entities };
  for (const other of ENTITY_KINDS) {
    const survivors = other === kind ? entities[other].filter((entity) => entity.id !== id) : entities[other];
    const cleaned = survivors.map((entity) => withoutReferenceTo(entity, other, kind, id));
    const unchanged = cleaned.every((entity, index) => entity === survivors[index]);
    next[other] = other !== kind && unchanged ? entities[other] : cleaned;
  }
  return next;
}

export function isNamed(entity: Entity): boolean {
  return entity.name.trim() !== '';
}

export function entityLabel(entity: Entity, kind: EntityKind): string {
  return isNamed(entity) ? entity.name.trim() : `Unnamed ${entityDefinitions[kind].singular}`;
}

function replaceKind(entities: ProjectEntities, kind: EntityKind, list: readonly Entity[]): ProjectEntities {
  return { ...entities, [kind]: list };
}

function emptyValue(field: EntityField): FieldValue {
  return field.kind === 'text' ? '' : [];
}

function applyEdit(entities: ProjectEntities, kind: EntityKind, entity: Entity, edit: EntityEdit): Entity {
  const fields: Record<string, FieldValue> = { ...entity.fields };
  let changed = false;
  for (const field of entityDefinitions[kind].fields) {
    const proposed = edit.fields?.[field.key];
    const accepted = proposed === undefined ? undefined : accept(entities, kind, entity.id, field, proposed);
    if (accepted !== undefined && !sameValue(accepted, fields[field.key])) {
      fields[field.key] = accepted;
      changed = true;
    }
  }
  const name = edit.name ?? entity.name;
  return changed || name !== entity.name ? { ...entity, name, fields } : entity;
}

function accept(entities: ProjectEntities, kind: EntityKind, ownId: string, field: EntityField, value: FieldValue): FieldValue | undefined {
  if (field.kind === 'text') {
    return typeof value === 'string' ? value : undefined;
  }
  if (typeof value === 'string') {
    return undefined;
  }
  const known = new Set(entities[field.references].map((entity) => entity.id));
  if (field.references === kind) {
    known.delete(ownId);
  }
  return [...new Set(value)].filter((id) => known.has(id));
}

function sameValue(a: FieldValue, b: FieldValue | undefined): boolean {
  if (typeof a === 'string' || typeof b === 'string' || b === undefined) {
    return a === b;
  }
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function withoutReferenceTo(entity: Entity, kind: EntityKind, removedKind: EntityKind, removedId: string): Entity {
  let fields = entity.fields;
  for (const field of entityDefinitions[kind].fields) {
    const value = fields[field.key];
    if (field.kind === 'references' && field.references === removedKind && typeof value !== 'string' && value?.includes(removedId)) {
      fields = { ...fields, [field.key]: value.filter((id) => id !== removedId) };
    }
  }
  return fields === entity.fields ? entity : { ...entity, fields };
}
