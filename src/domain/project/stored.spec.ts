import { addEntity, answer, createProject, SCHEMA_VERSION, updateEntity } from './project';
import { isStoredProject, migrateProject } from './stored';

const now = '2026-10-08T09:00:00.000Z';

function savedProject(): unknown {
  let project = createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now });
  project = answer(project, 'goals', 'goals', ['fewer no-shows', 'no reminder calls'], now);
  project = addEntity(project, 'actor', 'a1', now);
  project = updateEntity(project, 'actor', 'a1', { name: 'Receptionist', fields: { needs: 'Stop phoning' } }, now);
  return JSON.parse(JSON.stringify(project));
}

function withField(field: string, value: unknown): unknown {
  return { ...(savedProject() as object), [field]: value };
}

/** A project exactly as the walking skeleton wrote it, typed out by hand so it cannot drift with the code. */
function sliceOneProject(): unknown {
  return {
    schemaVersion: 1,
    id: 'p1',
    name: 'Reminders',
    mode: 'new-project',
    answers: {
      problem: { problem: 'No-shows cost us chairs', success: 'Fewer than one in ten' },
      users: { users: ['Receptionist', 'Patient'], needs: 'Stop phoning', primary: 'Receptionist' },
      goals: { goals: ['fewer no-shows'] },
    },
    currentStepId: 'users',
    createdAt: now,
    updatedAt: now,
  };
}

/** A project exactly as the workflow of steps 1-9 wrote it: modules had a purpose and nothing else. */
function sliceTwoProject(): unknown {
  return {
    schemaVersion: 2,
    id: 'p2',
    name: 'Reminders',
    mode: 'new-project',
    answers: { goals: { goals: ['fewer no-shows'] } },
    entities: {
      actor: [{ id: 'a1', name: 'Receptionist', fields: { needs: 'Stop phoning' } }],
      module: [
        { id: 'm1', name: 'Reminders', fields: { purpose: 'Decides when one is due' } },
        { id: 'm2', name: 'Messaging', fields: { purpose: 'Sends the text' } },
      ],
    },
    currentStepId: 'modules',
    createdAt: now,
    updatedAt: now,
  };
}

describe('isStoredProject', () => {
  it('accepts anything that names itself and says which schema wrote it', () => {
    expect(isStoredProject({ id: 'p1', schemaVersion: 0 })).toBe(true);
  });

  it('rejects values that are not a versioned project envelope', () => {
    expect(isStoredProject(undefined)).toBe(false);
    expect(isStoredProject('p1')).toBe(false);
    expect(isStoredProject({ id: 'p1' })).toBe(false);
    expect(isStoredProject({ schemaVersion: 1 })).toBe(false);
    expect(isStoredProject({ id: 1, schemaVersion: 1 })).toBe(false);
  });
});

describe('migrateProject', () => {
  function migrate(raw: unknown): ReturnType<typeof migrateProject> {
    return isStoredProject(raw) ? migrateProject(raw) : undefined;
  }

  it('reads a project saved by the current schema', () => {
    const project = migrate(savedProject());

    expect(project?.name).toBe('Reminders');
    expect(project?.answers).toEqual({ goals: { goals: ['fewer no-shows', 'no reminder calls'] } });
    expect(project?.entities.actor).toEqual([{ id: 'a1', name: 'Receptionist', fields: { needs: 'Stop phoning' } }]);
    expect(project?.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('refuses a project saved by a newer schema rather than guessing at it', () => {
    expect(migrate(withField('schemaVersion', SCHEMA_VERSION + 1))).toBeUndefined();
  });

  it('refuses a project from before the first schema', () => {
    expect(migrate(withField('schemaVersion', 0))).toBeUndefined();
  });

  it.each([
    ['name', 42],
    ['mode', 'unknown-mode'],
    ['currentStepId', 7],
    ['createdAt', undefined],
    ['updatedAt', null],
    ['answers', 'none'],
    ['answers', { problem: 'not a record of answers' }],
    ['answers', { problem: { problem: 5 } }],
    ['answers', { goals: { goals: ['ok', 5] } }],
    ['entities', 'none'],
    ['entities', { actor: 'not a list' }],
    ['entities', { actor: [{ id: 'a1', name: 5, fields: {} }] }],
    ['entities', { actor: [{ id: 'a1', name: 'x', fields: { needs: 5 } }] }],
    ['entities', { actor: [{ name: 'x', fields: {} }] }],
  ])('refuses a project whose %s is %j', (field, value) => {
    expect(migrate(withField(field, value))).toBeUndefined();
  });

  it('treats a kind of entity missing from storage as having no rows', () => {
    const project = migrate(withField('entities', { actor: [] }));

    expect(project?.entities).toEqual({
      actor: [],
      'use-case': [],
      concept: [],
      'external-system': [],
      module: [],
      'architecture-option': [],
    });
  });

  it('puts a project back on the first step when its step no longer exists', () => {
    const project = migrate(withField('currentStepId', 'a-step-we-removed'));

    expect(project?.currentStepId).toBe('problem');
  });

  describe('a Feature / Change project', () => {
    function savedFeatureChange(): unknown {
      let project = createProject({ id: 'f1', name: 'Cancel by text', mode: 'feature-change', now });
      project = answer(project, 'why', 'value', 'The desk stops phoning', now);
      project = addEntity(project, 'module', 'm1', now);
      project = updateEntity(project, 'module', 'm1', { name: 'Reminders', fields: { hides: 'Timing rules' } }, now);
      return { ...JSON.parse(JSON.stringify(project)), currentStepId: 'current-ownership' };
    }

    it('opens as it was saved, with no change to the schema', () => {
      const project = migrate(savedFeatureChange());

      expect(project).toMatchObject({
        schemaVersion: SCHEMA_VERSION,
        mode: 'feature-change',
        currentStepId: 'current-ownership',
        answers: { why: { value: 'The desk stops phoning' } },
      });
      expect(project?.entities.module.map((module) => module.name)).toEqual(['Reminders']);
    });

    it('goes back to its own first step, not the other workflow one, when its step no longer exists', () => {
      const raw = { ...(savedFeatureChange() as object), currentStepId: 'a-step-we-removed' };

      expect(migrate(raw)?.currentStepId).toBe('change');
    });
  });

  it('keeps answers to steps and questions it does not know', () => {
    const project = migrate(withField('answers', { later: { thing: 'kept' } }));

    expect(project?.answers).toEqual({ later: { thing: 'kept' } });
  });

  describe('from the walking skeleton (schema 1)', () => {
    it('opens, as the current schema', () => {
      const project = migrate(sliceOneProject());

      expect(project?.schemaVersion).toBe(SCHEMA_VERSION);
      expect(project).toMatchObject({ id: 'p1', name: 'Reminders', currentStepId: 'users', updatedAt: now });
    });

    it('turns the roles listed under Users into actors, in the same order', () => {
      const project = migrate(sliceOneProject());

      expect(project?.entities.actor.map((actor) => actor.name)).toEqual(['Receptionist', 'Patient']);
      expect(new Set(project?.entities.actor.map((actor) => actor.id)).size).toBe(2);
    });

    it('keeps every other answer, and does not keep the roles or the needs twice', () => {
      const project = migrate(sliceOneProject());

      expect(project?.answers).toEqual({
        problem: { problem: 'No-shows cost us chairs', success: 'Fewer than one in ten' },
        users: { primary: 'Receptionist' },
        goals: { goals: ['fewer no-shows'] },
      });
    });

    function withUsers(users: unknown): unknown {
      return { ...(sliceOneProject() as object), answers: { users } };
    }

    it('carries the needs text onto the first actor when there are several roles', () => {
      const project = migrate(sliceOneProject());

      expect(project?.entities.actor.map((actor) => actor.fields['needs'])).toEqual(['Stop phoning', '']);
    });

    it('carries the needs text onto the only actor', () => {
      const project = migrate(withUsers({ users: ['Receptionist'], needs: 'Stop phoning' }));

      expect(project?.entities.actor).toEqual([
        { id: 'actor-1', name: 'Receptionist', fields: { needs: 'Stop phoning' } },
      ]);
      expect(project?.answers).toEqual({ users: {} });
    });

    it('gives needs text with no roles to one unnamed actor rather than losing it', () => {
      const withoutList = migrate(withUsers({ needs: 'Stop phoning' }));
      const emptyList = migrate(withUsers({ users: [], needs: 'Stop phoning' }));

      for (const project of [withoutList, emptyList]) {
        expect(project?.entities.actor).toEqual([{ id: 'actor-1', name: '', fields: { needs: 'Stop phoning' } }]);
        expect(project?.answers).toEqual({ users: {} });
      }
    });

    it('drops blank needs text without inventing an actor', () => {
      const project = migrate(withUsers({ needs: '  \n ' }));

      expect(project?.entities.actor).toEqual([]);
      expect(project?.answers).toEqual({ users: {} });
    });

    it('starts with no rows of the kinds that did not exist yet', () => {
      const project = migrate(sliceOneProject());

      expect(project?.entities['use-case']).toEqual([]);
      expect(project?.entities.module).toEqual([]);
    });

    it('opens a project that had no roles listed', () => {
      const raw = { ...(sliceOneProject() as object), answers: {} };

      expect(migrate(raw)?.entities.actor).toEqual([]);
    });

    it('drops blank roles rather than carrying empty actors over', () => {
      const raw = { ...(sliceOneProject() as object), answers: { users: { users: ['Patient', '  '] } } };

      expect(migrate(raw)?.entities.actor.map((actor) => actor.name)).toEqual(['Patient']);
    });

    it('still refuses a schema 1 project that is damaged', () => {
      expect(migrate({ ...(sliceOneProject() as object), answers: 'none' })).toBeUndefined();
    });
  });

  describe('from the steps 1-9 workflow (schema 2)', () => {
    it('opens, as the current schema, with its answers and rows kept', () => {
      const project = migrate(sliceTwoProject());

      expect(project?.schemaVersion).toBe(SCHEMA_VERSION);
      expect(project).toMatchObject({ id: 'p2', currentStepId: 'modules', answers: { goals: { goals: ['fewer no-shows'] } } });
      expect(project?.entities.actor).toEqual([{ id: 'a1', name: 'Receptionist', fields: { needs: 'Stop phoning' } }]);
    });

    it('gives each module the new details, empty, and keeps what it already said', () => {
      const project = migrate(sliceTwoProject());

      expect(project?.entities.module).toEqual([
        {
          id: 'm1',
          name: 'Reminders',
          fields: { purpose: 'Decides when one is due', responsibilities: [], hides: '', interface: '', dependsOn: [] },
        },
        {
          id: 'm2',
          name: 'Messaging',
          fields: { purpose: 'Sends the text', responsibilities: [], hides: '', interface: '', dependsOn: [] },
        },
      ]);
    });

    it('starts with no architecture options', () => {
      expect(migrate(sliceTwoProject())?.entities['architecture-option']).toEqual([]);
    });

    it('opens a project with no modules at all', () => {
      const raw = { ...(sliceTwoProject() as object), entities: {} };

      expect(migrate(raw)?.entities.module).toEqual([]);
    });

    it('still refuses a schema 2 project that is damaged', () => {
      expect(migrate({ ...(sliceTwoProject() as object), entities: 'none' })).toBeUndefined();
      expect(migrate({ ...(sliceTwoProject() as object), entities: { module: 'none' } })).toBeUndefined();
    });
  });
});
