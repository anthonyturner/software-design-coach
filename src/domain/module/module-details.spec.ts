import { entityDefinitions } from '../entity/entity-definitions';
import type { EntityEdit } from '../entity/entity.types';
import { addEntity, createProject, removeEntity, updateEntity } from '../project/project';
import type { Project } from '../project/project.types';
import { moduleDetails } from './module-details';

const now = '2026-10-08T09:00:00.000Z';

function withModule(project: Project, id: string, name: string, fields: EntityEdit['fields'] = {}): Project {
  return updateEntity(addEntity(project, 'module', id, now), 'module', id, { name, fields }, now);
}

describe('moduleDetails', () => {
  const empty = createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now });

  it('asks the model for the fields it holds, so renaming one fails here and not quietly in the drawer', () => {
    const keys = entityDefinitions.module.fields.map((field) => field.key);

    expect(keys).toEqual(expect.arrayContaining(['purpose', 'responsibilities', 'hides', 'interface', 'dependsOn']));
  });

  it('gives undefined for a module that is not in the project', () => {
    expect(moduleDetails(withModule(empty, 'm1', 'Scheduling'), 'nope')).toBeUndefined();
    expect(moduleDetails(empty, 'm1')).toBeUndefined();
  });

  it('gives undefined for a row that is not a module, even when the id matches', () => {
    const project = updateEntity(addEntity(empty, 'actor', 'a1', now), 'actor', 'a1', { name: 'Receptionist' }, now);

    expect(moduleDetails(project, 'a1')).toBeUndefined();
  });

  it('gives undefined for a module with no name yet, since the diagrams do not draw it', () => {
    expect(moduleDetails(addEntity(empty, 'module', 'm1', now), 'm1')).toBeUndefined();
  });

  it('carries the name, purpose, hidden knowledge and interface sketch as the user wrote them', () => {
    const project = withModule(empty, 'm1', ' Scheduling ', {
      purpose: 'Owns appointment times',
      hides: 'The calendar rules',
      interface: 'book(slot)',
    });

    expect(moduleDetails(project, 'm1')).toMatchObject({
      id: 'm1',
      name: 'Scheduling',
      purpose: 'Owns appointment times',
      hides: 'The calendar rules',
      interfaceSketch: 'book(slot)',
    });
  });

  it('lists the responsibilities without the blank lines', () => {
    const project = withModule(empty, 'm1', 'Scheduling', { responsibilities: ['Find a free slot', '  ', 'Hold the slot'] });

    expect(moduleDetails(project, 'm1')?.responsibilities).toEqual(['Find a free slot', 'Hold the slot']);
  });

  it('leaves the fields empty for a module that has only a name', () => {
    expect(moduleDetails(withModule(empty, 'm1', 'Scheduling'), 'm1')).toEqual({
      id: 'm1',
      name: 'Scheduling',
      purpose: '',
      responsibilities: [],
      hides: '',
      interfaceSketch: '',
      dependencies: [],
      dependents: [],
    });
  });

  describe('dependencies and dependents', () => {
    const project = withModule(
      withModule(withModule(withModule(empty, 'm1', 'Scheduling'), 'm2', 'Notifier'), 'm3', 'Storage'),
      'm4',
      'Reports',
    );
    const wired = updateEntity(
      updateEntity(
        updateEntity(project, 'module', 'm1', { fields: { dependsOn: ['m3', 'm2'] } }, now),
        'module',
        'm4',
        { fields: { dependsOn: ['m1'] } },
        now,
      ),
      'module',
      'm2',
      { fields: { dependsOn: ['m1'] } },
      now,
    );

    it('names what the module needs, in the order the user listed them', () => {
      expect(moduleDetails(wired, 'm1')?.dependencies).toEqual(['Storage', 'Notifier']);
    });

    it('names the modules that need it, in the order the modules are listed', () => {
      expect(moduleDetails(wired, 'm1')?.dependents).toEqual(['Notifier', 'Reports']);
    });

    it('has no dependents or dependencies for a module nobody is wired to', () => {
      const alone = moduleDetails(wired, 'm3');

      expect(alone?.dependencies).toEqual([]);
      expect(alone?.dependents).toEqual(['Scheduling']);
    });

    it('leaves out a dependency that has no name, as the dependency diagram does', () => {
      const withBlank = updateEntity(addEntity(wired, 'module', 'm5', now), 'module', 'm1', { fields: { dependsOn: ['m3', 'm5'] } }, now);

      expect(moduleDetails(withBlank, 'm1')?.dependencies).toEqual(['Storage']);
    });

    it('stops listing a module that was removed', () => {
      expect(moduleDetails(removeEntity(wired, 'module', 'm3', now), 'm1')?.dependencies).toEqual(['Notifier']);
    });
  });
});
