import { findStep, workflowFor } from '../workflow/workflow';
import { addEntity, answer, createProject, goTo, updateEntity } from './project';
import { journeyOf, openQuestions } from './progress';
import type { Project } from './project.types';

const now = '2026-10-08T09:00:00.000Z';

function newProject(): Project {
  return createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now });
}

function stepNamed(id: string): NonNullable<ReturnType<typeof findStep>> {
  const step = findStep(workflowFor('new-project'), id);
  if (!step) {
    throw new Error(`no step ${id}`);
  }
  return step;
}

function stateOf(project: Project, stepId: string): string | undefined {
  return journeyOf(project).find((stop) => stop.stepId === stepId)?.state;
}

function problemAnswered(project: Project): Project {
  return ['problem', 'pain', 'success'].reduce((p, id) => answer(p, 'problem', id, 'something', now), project);
}

function withActor(project: Project, name: string): Project {
  return updateEntity(addEntity(project, 'actor', 'a1', now), 'actor', 'a1', { name }, now);
}

describe('journeyOf', () => {
  it('lists every step in order, numbered from one, with its title', () => {
    const stops = journeyOf(newProject());

    expect(stops).toHaveLength(workflowFor('new-project').steps.length);
    expect(stops.map((stop) => stop.number)).toEqual(stops.map((_, index) => index + 1));
    expect(stops[0]).toMatchObject({ stepId: 'problem', title: 'Problem' });
  });

  it('marks the step the project is on as current and the rest as not started', () => {
    const states = journeyOf(newProject()).map((stop) => stop.state);

    expect(states[0]).toBe('current');
    expect(states.slice(1).every((state) => state === 'not-started')).toBe(true);
  });

  it('marks a step done once every required question is answered, even without the optional ones', () => {
    const project = goTo(problemAnswered(newProject()), 'users', now);

    expect(stateOf(project, 'problem')).toBe('done');
  });

  it('keeps the step you are on as current even when it is complete', () => {
    expect(stateOf(problemAnswered(newProject()), 'problem')).toBe('current');
  });

  it('marks a step with some answers but not all as in progress', () => {
    const project = goTo(answer(newProject(), 'problem', 'problem', 'No-shows', now), 'users', now);

    expect(stateOf(project, 'problem')).toBe('in-progress');
  });

  it('does not count an answer of only whitespace', () => {
    const project = goTo(answer(newProject(), 'problem', 'problem', '   \n ', now), 'users', now);

    expect(stateOf(project, 'problem')).toBe('not-started');
  });

  it('does not count a list answer with no items', () => {
    const project = goTo(answer(newProject(), 'goals', 'goals', [], now), 'users', now);

    expect(stateOf(project, 'goals')).toBe('not-started');
  });

  it('counts a chosen option', () => {
    const project = goTo(answer(newProject(), 'system-boundary', 'kind', 'service', now), 'users', now);

    expect(stateOf(project, 'system-boundary')).toBe('in-progress');
  });

  it('counts an entity list once it has a named row, and not before', () => {
    const base = goTo(newProject(), 'goals', now);

    expect(stateOf(base, 'users')).toBe('not-started');
    expect(stateOf(addEntity(base, 'actor', 'a1', now), 'users')).toBe('not-started');
    expect(stateOf(withActor(base, 'Receptionist'), 'users')).toBe('done');
  });

  it('is not done while another required question is open, even with a named row', () => {
    let project = addEntity(newProject(), 'external-system', 'e1', now);
    project = updateEntity(project, 'external-system', 'e1', { name: 'Text provider' }, now);

    expect(stateOf(goTo(project, 'users', now), 'system-boundary')).toBe('in-progress');
  });

  it('treats a step with only optional answers given as in progress, not done', () => {
    const project = goTo(answer(newProject(), 'users', 'primary', 'Receptionist', now), 'goals', now);

    expect(stateOf(project, 'users')).toBe('in-progress');
  });
});

describe('openQuestions', () => {
  it('lists the required questions still unanswered, in order', () => {
    const project = answer(newProject(), 'problem', 'pain', 'phone calls', now);

    expect(openQuestions(project, stepNamed('problem')).map((question) => question.id)).toEqual(['problem', 'success']);
  });

  it('leaves out optional questions', () => {
    expect(openQuestions(newProject(), stepNamed('users')).map((question) => question.id)).toEqual(['users']);
  });

  it('is empty once the step is done', () => {
    expect(openQuestions(problemAnswered(newProject()), stepNamed('problem'))).toEqual([]);
  });
});
