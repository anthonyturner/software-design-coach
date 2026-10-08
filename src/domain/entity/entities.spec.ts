import {
  emptyEntities,
  entityLabel,
  entityOptions,
  hasFieldContent,
  isNamed,
  referenceCandidates,
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
    expect(emptyEntities()).toEqual({
      actor: [],
      'use-case': [],
      concept: [],
      'external-system': [],
      module: [],
      'architecture-option': [],
    });
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

const moduleRow =
  (id: string, name: string, fields: Readonly<Record<string, string | readonly string[]>> = {}): Step =>
  (entities) =>
    withEditedEntity(withEntity(entities, 'module', id), 'module', id, { name, fields });

describe('what a module holds', () => {
  it('starts with every detail empty', () => {
    const [row] = withEntity(emptyEntities(), 'module', 'm1').module;

    expect(row.fields).toEqual({ purpose: '', responsibilities: [], hides: '', interface: '', dependsOn: [] });
  });

  it('keeps responsibilities as a list, in the order given and as typed', () => {
    const entities = build(moduleRow('m1', 'Reminders', { responsibilities: ['Decide when one is due', 'Word it', 'Word it'] }));

    expect(entities.module[0].fields['responsibilities']).toEqual(['Decide when one is due', 'Word it', 'Word it']);
  });

  it('refuses text for a list and a list for text', () => {
    const before = build(moduleRow('m1', 'Reminders'));

    expect(withEditedEntity(before, 'module', 'm1', { fields: { responsibilities: 'one thing' } })).toBe(before);
    expect(withEditedEntity(before, 'module', 'm1', { fields: { hides: ['a', 'b'] } })).toBe(before);
  });

  it('reports no change when the list already says that', () => {
    const before = build(moduleRow('m1', 'Reminders', { responsibilities: ['Decide when one is due'] }));

    expect(withEditedEntity(before, 'module', 'm1', { fields: { responsibilities: ['Decide when one is due'] } })).toBe(before);
  });
});

describe('what a module depends on', () => {
  const three = build(moduleRow('m1', 'Reminders'), moduleRow('m2', 'Messaging'), moduleRow('m3', 'Scheduling'));
  const withDependencies = (ids: readonly string[]): ProjectEntities =>
    withEditedEntity(three, 'module', 'm1', { fields: { dependsOn: ids } });

  it('names other modules by id, once each, in the order given', () => {
    expect(withDependencies(['m3', 'm2', 'm3']).module[0].fields['dependsOn']).toEqual(['m3', 'm2']);
  });

  it('is never the module itself, which would only draw a loop', () => {
    expect(withDependencies(['m1', 'm2']).module[0].fields['dependsOn']).toEqual(['m2']);
  });

  it('cannot name a module that does not exist', () => {
    expect(withDependencies(['ghost']).module[0].fields['dependsOn']).toEqual([]);
  });

  it('follows the module through a rename', () => {
    const renamed = withEditedEntity(withDependencies(['m2']), 'module', 'm2', { name: 'Texting' });
    const [target] = renamed.module[0].fields['dependsOn'];

    expect(renamed.module.find((found) => found.id === target)?.name).toBe('Texting');
  });

  it('is cleaned up when the module it names is removed, leaving the other dependencies', () => {
    const after = withoutEntity(withDependencies(['m2', 'm3']), 'module', 'm2');

    expect(after.module.map((found) => found.fields['dependsOn'])).toEqual([['m3'], []]);
  });
});

describe('architecture options', () => {
  it('start with an approach, strengths and costs to fill in', () => {
    const [row] = withEntity(emptyEntities(), 'architecture-option', 'o1')['architecture-option'];

    expect(row.fields).toEqual({ approach: '', strengths: '', costs: '' });
  });
});

describe('entityOptions', () => {
  it('offers the named rows of a kind, in order, as value and label', () => {
    const entities = build(actor('a1', 'Receptionist'), actor('a2', '  '), actor('a3', 'Patient'));

    expect(entityOptions(entities, 'actor')).toEqual([
      { value: 'a1', label: 'Receptionist' },
      { value: 'a3', label: 'Patient' },
    ]);
  });

  it('offers nothing when no row is named', () => {
    expect(entityOptions(emptyEntities(), 'module')).toEqual([]);
  });
});

describe('referenceCandidates', () => {
  const modules = build(moduleRow('m1', 'Reminders'), moduleRow('m2', 'Messaging'), actor('a1', 'Patient'));

  it('offers every row of the other kind', () => {
    expect(referenceCandidates(modules, 'use-case', 'u1', 'actor').map((found) => found.id)).toEqual(['a1']);
  });

  it('offers every other row of the same kind, never the row itself', () => {
    expect(referenceCandidates(modules, 'module', 'm1', 'module').map((found) => found.id)).toEqual(['m2']);
  });
});

describe('hasFieldContent', () => {
  it('is true once a named row has something written in the field', () => {
    const entities = build(moduleRow('m1', 'Reminders'), moduleRow('m2', 'Messaging'));
    expect(hasFieldContent(entities, 'module', 'dependsOn')).toBe(false);

    const written = withEditedEntity(entities, 'module', 'm1', { fields: { dependsOn: ['m2'] } });
    expect(hasFieldContent(written, 'module', 'dependsOn')).toBe(true);
  });

  it('ignores blank lines and rows with no name', () => {
    const blank = build(moduleRow('m1', 'Reminders', { responsibilities: ['  '] }));
    const unnamed = build(moduleRow('m2', '', { responsibilities: ['Something'] }));

    expect(hasFieldContent(blank, 'module', 'responsibilities')).toBe(false);
    expect(hasFieldContent(unnamed, 'module', 'responsibilities')).toBe(false);
  });
});
