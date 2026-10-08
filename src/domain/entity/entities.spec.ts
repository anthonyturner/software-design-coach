import {
  emptyEntities,
  entityLabel,
  isNamed,
  withEditedEntity,
  withEntity,
  withMovedEntity,
  withoutEntity,
} from './entities';
import type { EntityKind, ProjectEntities } from './entity.types';

type Step = (entities: ProjectEntities) => ProjectEntities;

function build(...steps: Step[]): ProjectEntities {
  return steps.reduce((entities, step) => step(entities), emptyEntities());
}

const actor =
  (id: string, name: string): Step =>
  (entities) =>
    withEditedEntity(withEntity(entities, 'actor', id), 'actor', id, { name });

const useCase =
  (id: string, name: string, actors: readonly string[]): Step =>
  (entities) =>
    withEditedEntity(withEntity(entities, 'use-case', id), 'use-case', id, { name, fields: { actors } });

const ids = (entities: ProjectEntities, kind: EntityKind): string[] => entities[kind].map((entity) => entity.id);

describe('emptyEntities', () => {
  it('has a list for every kind', () => {
    expect(emptyEntities()).toEqual({ actor: [], 'use-case': [], concept: [], 'external-system': [], module: [] });
  });
});

describe('withEntity', () => {
  it('appends an unnamed row with every field empty', () => {
    const entities = withEntity(emptyEntities(), 'use-case', 'u1');

    expect(entities['use-case']).toEqual([{ id: 'u1', name: '', fields: { actors: [], outcome: '' } }]);
  });

  it('keeps rows in the order they were added', () => {
    const entities = build(actor('a1', 'Receptionist'), actor('a2', 'Patient'));

    expect(ids(entities, 'actor')).toEqual(['a1', 'a2']);
  });

  it('ignores an id the list already has', () => {
    const before = build(actor('a1', 'Receptionist'));

    expect(withEntity(before, 'actor', 'a1')).toBe(before);
  });

  it('leaves the entities it was given untouched', () => {
    const before = emptyEntities();

    withEntity(before, 'actor', 'a1');

    expect(before).toEqual(emptyEntities());
  });
});

describe('withEditedEntity', () => {
  it('renames a row and keeps its id', () => {
    const entities = withEditedEntity(build(actor('a1', 'Reception')), 'actor', 'a1', { name: 'Receptionist' });

    expect(entities.actor).toEqual([{ id: 'a1', name: 'Receptionist', fields: { needs: '' } }]);
  });

  it('keeps the name exactly as typed, so a trailing space is not eaten mid-word', () => {
    const entities = withEditedEntity(build(actor('a1', '')), 'actor', 'a1', { name: 'Front desk ' });

    expect(entities.actor[0].name).toBe('Front desk ');
  });

  it('sets a text field and leaves the others', () => {
    const entities = withEditedEntity(build(actor('a1', 'Patient')), 'actor', 'a1', {
      fields: { needs: 'A reminder' },
    });

    expect(entities.actor[0]).toEqual({ id: 'a1', name: 'Patient', fields: { needs: 'A reminder' } });
  });

  it('sets a reference field to the actors that exist, once each, in the order given', () => {
    const entities = build(actor('a1', 'Receptionist'), actor('a2', 'Patient'), useCase('u1', 'Confirm', ['a2', 'a1', 'a2']));

    expect(entities['use-case'][0].fields['actors']).toEqual(['a2', 'a1']);
  });

  it('cannot be made to reference an entity that does not exist', () => {
    const entities = build(actor('a1', 'Receptionist'), useCase('u1', 'Confirm', ['a1', 'ghost']));

    expect(entities['use-case'][0].fields['actors']).toEqual(['a1']);
  });

  it('ignores a field the kind does not have and a value of the wrong shape', () => {
    const before = build(actor('a1', 'Patient'));

    expect(withEditedEntity(before, 'actor', 'a1', { fields: { nope: 'x' } })).toBe(before);
    expect(withEditedEntity(before, 'actor', 'a1', { fields: { needs: ['not', 'text'] } })).toBe(before);
  });

  it('ignores a row that is not there', () => {
    const before = build(actor('a1', 'Patient'));

    expect(withEditedEntity(before, 'actor', 'ghost', { name: 'x' })).toBe(before);
  });

  it('reports no change when the edit says what the row already says', () => {
    const before = build(actor('a1', 'Patient'));

    expect(withEditedEntity(before, 'actor', 'a1', { name: 'Patient', fields: { needs: '' } })).toBe(before);
  });
});

describe('withMovedEntity', () => {
  const three = build(actor('a1', 'one'), actor('a2', 'two'), actor('a3', 'three'));

  it('moves a row up', () => {
    expect(ids(withMovedEntity(three, 'actor', 'a2', -1), 'actor')).toEqual(['a2', 'a1', 'a3']);
  });

  it('moves a row down', () => {
    expect(ids(withMovedEntity(three, 'actor', 'a2', 1), 'actor')).toEqual(['a1', 'a3', 'a2']);
  });

  it('stays put at either end rather than failing', () => {
    expect(withMovedEntity(three, 'actor', 'a1', -1)).toBe(three);
    expect(withMovedEntity(three, 'actor', 'a3', 1)).toBe(three);
  });

  it('ignores a row that is not there', () => {
    expect(withMovedEntity(three, 'actor', 'ghost', 1)).toBe(three);
  });
});

describe('withoutEntity', () => {
  it('removes the row', () => {
    const entities = withoutEntity(build(actor('a1', 'one'), actor('a2', 'two')), 'actor', 'a1');

    expect(ids(entities, 'actor')).toEqual(['a2']);
  });

  it('succeeds when the row is already gone', () => {
    const before = build(actor('a1', 'one'));

    expect(withoutEntity(before, 'actor', 'ghost')).toBe(before);
  });

  it('takes the removed entity out of every reference to it, and keeps the other references', () => {
    const entities = build(
      actor('a1', 'Receptionist'),
      actor('a2', 'Patient'),
      useCase('u1', 'Confirm', ['a1', 'a2']),
      useCase('u2', 'Book', ['a1']),
    );

    const after = withoutEntity(entities, 'actor', 'a1');

    expect(after['use-case'].map((found) => found.fields['actors'])).toEqual([['a2'], []]);
  });

  it('cleans references between entities of the same kind', () => {
    const entities = build(
      (e) => withEntity(e, 'concept', 'c1'),
      (e) => withEntity(e, 'concept', 'c2'),
      (e) => withEditedEntity(e, 'concept', 'c2', { fields: { related: ['c1'] } }),
    );

    expect(withoutEntity(entities, 'concept', 'c1').concept[0].fields['related']).toEqual([]);
  });

  it('leaves the lists of kinds that cannot refer to the removed kind as they were', () => {
    const entities = build(actor('a1', 'Receptionist'), useCase('u1', 'Confirm', ['a1']));
    const before = entities;

    const after = withoutEntity(entities, 'actor', 'a1');

    expect(after.actor).not.toBe(before.actor);
    expect(after['use-case']).not.toBe(before['use-case']);
    expect(after.module).toBe(before.module);
    expect(after['external-system']).toBe(before['external-system']);
    expect(after.concept).toBe(before.concept);
  });

  it('keeps the list of a kind that refers to the removed kind but names none of it', () => {
    const entities = build(actor('a1', 'Receptionist'), useCase('u1', 'Confirm', []));

    expect(withoutEntity(entities, 'actor', 'a1')['use-case']).toBe(entities['use-case']);
  });

  it('keeps references to a different kind that happens to share an id', () => {
    const entities = build(
      actor('x', 'Patient'),
      (e) => withEntity(e, 'concept', 'x'),
      (e) => withEntity(e, 'concept', 'c2'),
      (e) => withEditedEntity(e, 'concept', 'c2', { fields: { related: ['x'] } }),
    );

    expect(withoutEntity(entities, 'actor', 'x').concept[1].fields['related']).toEqual(['x']);
  });
});

describe('a concept relating to itself', () => {
  it('is refused, since it would only draw a loop', () => {
    const entities = build(
      (e) => withEntity(e, 'concept', 'c1'),
      (e) => withEntity(e, 'concept', 'c2'),
      (e) => withEditedEntity(e, 'concept', 'c1', { fields: { related: ['c1', 'c2'] } }),
    );

    expect(entities.concept[0].fields['related']).toEqual(['c2']);
  });

  it('reports no change when the only thing asked for is a self reference', () => {
    const before = build((e) => withEntity(e, 'concept', 'c1'));

    expect(withEditedEntity(before, 'concept', 'c1', { fields: { related: ['c1'] } })).toBe(before);
  });
});

describe('references survive a rename', () => {
  it('points at the same actor under its new name', () => {
    const entities = build(
      actor('a1', 'Reception'),
      useCase('u1', 'Confirm', ['a1']),
      (e) => withEditedEntity(e, 'actor', 'a1', { name: 'Receptionist' }),
    );

    const [referenced] = entities['use-case'][0].fields['actors'];

    expect(entities.actor.find((found) => found.id === referenced)?.name).toBe('Receptionist');
  });
});

describe('naming', () => {
  it('counts a row as named once it has more than whitespace', () => {
    const [blank] = withEntity(emptyEntities(), 'actor', 'a1').actor;
    const [spaces] = build(actor('a1', '   ')).actor;
    const [named] = build(actor('a1', 'Patient')).actor;

    expect([isNamed(blank), isNamed(spaces), isNamed(named)]).toEqual([false, false, true]);
  });

  it('labels a row by its name, or says it is unnamed', () => {
    const [unnamed] = withEntity(emptyEntities(), 'use-case', 'u1')['use-case'];
    const [named] = build(actor('a1', ' Patient ')).actor;

    expect(entityLabel(unnamed, 'use-case')).toBe('Unnamed use case');
    expect(entityLabel(named, 'actor')).toBe('Patient');
  });
});
