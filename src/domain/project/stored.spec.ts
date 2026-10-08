import { answer, createProject, SCHEMA_VERSION } from './project';
import { isStoredProject, migrateProject } from './stored';

const now = '2026-10-08T09:00:00.000Z';

function savedProject(): unknown {
  const project = createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now });
  const answered = answer(project, 'users', 'users', ['receptionist', 'patient'], now);
  return JSON.parse(JSON.stringify(answered));
}

function withField(field: string, value: unknown): unknown {
  return { ...(savedProject() as object), [field]: value };
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
    expect(project?.answers).toEqual({ users: { users: ['receptionist', 'patient'] } });
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
    ['answers', { users: { users: ['ok', 5] } }],
  ])('refuses a project whose %s is %j', (field, value) => {
    expect(migrate(withField(field, value))).toBeUndefined();
  });

  it('puts a project back on the first step when its step no longer exists', () => {
    const project = migrate(withField('currentStepId', 'a-step-we-removed'));

    expect(project?.currentStepId).toBe('problem');
  });

  it('keeps answers to steps and questions it does not know', () => {
    const project = migrate(withField('answers', { later: { thing: 'kept' } }));

    expect(project?.answers).toEqual({ later: { thing: 'kept' } });
  });
});
