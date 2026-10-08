import { answer, createProject, goTo, isProjectSummary, stepAnswers, summarize, SCHEMA_VERSION } from './project';

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
    const project = answer(newProject(), 'users', 'users', ['receptionist', 'patient'], later);

    expect(stepAnswers(project, 'users')['users']).toEqual(['receptionist', 'patient']);
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
    expect(answer(before, 'users', 'users', 'not a list', later)).toBe(before);
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
