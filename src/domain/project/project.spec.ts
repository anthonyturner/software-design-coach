import {
  addEntity,
  answer,
  createProject,
  goTo,
  isProjectSummary,
  moveEntity,
  removeEntity,
  stepAnswers,
  summarize,
  updateEntity,
  SCHEMA_VERSION,
} from './project';

const created = '2026-10-08T09:00:00.000Z';
const later = '2026-10-08T09:05:00.000Z';

function newProject(): ReturnType<typeof createProject> {
  return createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now: created });
}

describe('createProject', () => {
  it('starts at the first step with no answers', () => {
    expect(newProject()).toEqual({
      schemaVersion: SCHEMA_VERSION,
      id: 'p1',
      name: 'Reminders',
      mode: 'new-project',
      answers: {},
      entities: { actor: [], 'use-case': [], concept: [], 'external-system': [], module: [] },
      currentStepId: 'problem',
      createdAt: created,
      updatedAt: created,
    });
  });

  it('trims the name', () => {
    const project = createProject({ id: 'p1', name: '  Reminders  ', mode: 'new-project', now: created });

    expect(project.name).toBe('Reminders');
  });

  it('names a project with a blank name rather than refusing it', () => {
    const project = createProject({ id: 'p1', name: '   ', mode: 'new-project', now: created });

    expect(project.name).toBe('Untitled project');
  });
});

describe('answer', () => {
  it('records a text answer under its step and question', () => {
    const project = answer(newProject(), 'problem', 'problem', 'No-shows cost us chairs', later);

    expect(project.answers).toEqual({ problem: { problem: 'No-shows cost us chairs' } });
  });

  it('records a list answer', () => {
    const project = answer(newProject(), 'goals', 'goals', ['fewer no-shows', 'no calls'], later);

    expect(stepAnswers(project, 'goals')['goals']).toEqual(['fewer no-shows', 'no calls']);
  });

  it('records a chosen option', () => {
    const project = answer(newProject(), 'system-boundary', 'kind', 'service', later);

    expect(stepAnswers(project, 'system-boundary')['kind']).toBe('service');
  });

  it('replaces an earlier answer and keeps the others', () => {
    let project = answer(newProject(), 'problem', 'problem', 'first', later);
    project = answer(project, 'problem', 'pain', 'phone calls', later);
    project = answer(project, 'problem', 'problem', 'second', later);

    expect(stepAnswers(project, 'problem')).toEqual({ problem: 'second', pain: 'phone calls' });
  });

  it('leaves the project it was given untouched', () => {
    const before = newProject();

    answer(before, 'problem', 'problem', 'changed', later);

    expect(before).toEqual(newProject());
  });

  it('stamps when the project last changed', () => {
    const project = answer(newProject(), 'problem', 'problem', 'x', later);

    expect(project.updatedAt).toBe(later);
    expect(project.createdAt).toBe(created);
  });

  it('ignores an answer to a step the workflow does not have', () => {
    const before = newProject();

    expect(answer(before, 'nope', 'problem', 'x', later)).toBe(before);
  });

  it('ignores an answer to a question the step does not ask', () => {
    const before = newProject();

    expect(answer(before, 'problem', 'nope', 'x', later)).toBe(before);
  });

  it('ignores an answer whose shape does not fit the question', () => {
    const before = newProject();

    expect(answer(before, 'problem', 'problem', ['not', 'text'], later)).toBe(before);
    expect(answer(before, 'goals', 'goals', 'not a list', later)).toBe(before);
  });

  it('ignores a choice that is not one of the options', () => {
    const before = newProject();

    expect(answer(before, 'system-boundary', 'kind', 'spaceship', later)).toBe(before);
    expect(answer(before, 'system-boundary', 'kind', ['service'], later)).toBe(before);
  });

  it('ignores an answer to an entity list, which is edited row by row', () => {
    const before = newProject();

    expect(answer(before, 'users', 'users', ['receptionist'], later)).toBe(before);
  });
});

describe('editing entities', () => {
  function withTwoActors(): ReturnType<typeof createProject> {
    let project = addEntity(newProject(), 'actor', 'a1', later);
    project = updateEntity(project, 'actor', 'a1', { name: 'Receptionist' }, later);
    project = addEntity(project, 'actor', 'a2', later);
    return updateEntity(project, 'actor', 'a2', { name: 'Patient' }, later);
  }

  it('adds, renames, reorders and removes rows', () => {
    const moved = moveEntity(withTwoActors(), 'actor', 'a2', -1, later);

    expect(moved.entities.actor.map((actor) => actor.name)).toEqual(['Patient', 'Receptionist']);
    expect(removeEntity(moved, 'actor', 'a2', later).entities.actor.map((actor) => actor.name)).toEqual(['Receptionist']);
  });

  it('stamps when the project last changed', () => {
    const project = addEntity(newProject(), 'actor', 'a1', later);

    expect(project.updatedAt).toBe(later);
  });

  it('leaves the project it was given untouched', () => {
    const before = newProject();

    addEntity(before, 'actor', 'a1', later);

    expect(before).toEqual(newProject());
  });

  it('returns the same project when nothing changed, so nothing is saved needlessly', () => {
    const project = withTwoActors();

    expect(updateEntity(project, 'actor', 'a1', { name: 'Receptionist' }, later)).toBe(project);
    expect(moveEntity(project, 'actor', 'a1', -1, later)).toBe(project);
    expect(removeEntity(project, 'actor', 'ghost', later)).toBe(project);
    expect(addEntity(project, 'actor', 'a1', later)).toBe(project);
  });

  it('removes an actor from the use cases that named it', () => {
    let project = addEntity(withTwoActors(), 'use-case', 'u1', later);
    project = updateEntity(project, 'use-case', 'u1', { name: 'Confirm', fields: { actors: ['a1', 'a2'] } }, later);

    project = removeEntity(project, 'actor', 'a1', later);

    expect(project.entities['use-case'][0].fields['actors']).toEqual(['a2']);
  });
});

describe('goTo', () => {
  it('moves the project to another step', () => {
    const project = goTo(newProject(), 'users', later);

    expect(project.currentStepId).toBe('users');
    expect(project.updatedAt).toBe(later);
  });

  it('stays where it is for a step the workflow does not have', () => {
    const before = newProject();

    expect(goTo(before, 'nope', later)).toBe(before);
  });
});

describe('stepAnswers', () => {
  it('is empty for a step with no answers yet', () => {
    expect(stepAnswers(newProject(), 'goals')).toEqual({});
  });
});

describe('summarize', () => {
  it('keeps what the project list needs', () => {
    const project = answer(newProject(), 'problem', 'problem', 'x', later);

    expect(summarize(project)).toEqual({
      id: 'p1',
      name: 'Reminders',
      mode: 'new-project',
      updatedAt: later,
    });
  });
});

describe('isProjectSummary', () => {
  it('recognises what summarize produces', () => {
    expect(isProjectSummary(summarize(newProject()))).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isProjectSummary(undefined)).toBe(false);
    expect(isProjectSummary({ id: 'p1', name: 'x', mode: 'new-project' })).toBe(false);
    expect(isProjectSummary({ id: 'p1', name: 'x', mode: 'other', updatedAt: created })).toBe(false);
  });
});
