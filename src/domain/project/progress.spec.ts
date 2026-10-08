import { findStep, workflowFor } from '../workflow/workflow';
import { addEntity, answer, createProject, goTo, NONE_ANSWER, updateEntity } from './project';
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

describe('steps that edit the rows listed earlier', () => {
  function withModule(project: Project, id: string, name: string, fields: Record<string, string | string[]> = {}): Project {
    return updateEntity(addEntity(project, 'module', id, now), 'module', id, { name, fields }, now);
  }

  it('is not started until some named module has something written in the field', () => {
    const modules = withModule(withModule(goTo(newProject(), 'users', now), 'm1', 'Reminders'), 'm2', 'Messaging');

    expect(stateOf(modules, 'responsibilities')).toBe('not-started');
    expect(
      stateOf(updateEntity(modules, 'module', 'm1', { fields: { responsibilities: ['Decide when one is due'] } }, now), 'responsibilities'),
    ).toBe('done');
  });

  it('does not count blank lines or a module that has no name', () => {
    const blank = withModule(goTo(newProject(), 'users', now), 'm1', 'Reminders', { responsibilities: ['  '] });
    const unnamed = withModule(goTo(newProject(), 'users', now), 'm2', '', { responsibilities: ['Something'] });

    expect(stateOf(blank, 'responsibilities')).toBe('not-started');
    expect(stateOf(unnamed, 'responsibilities')).toBe('not-started');
  });

  it('counts a dependency as written', () => {
    let project = withModule(withModule(goTo(newProject(), 'users', now), 'm1', 'Reminders'), 'm2', 'Messaging');
    expect(stateOf(project, 'dependencies')).toBe('not-started');

    project = updateEntity(project, 'module', 'm1', { fields: { dependsOn: ['m2'] } }, now);

    expect(stateOf(project, 'dependencies')).toBe('done');
  });

  it('counts the answer that no module depends on another, as a one-module design must be able to give', () => {
    const oneModule = withModule(goTo(newProject(), 'users', now), 'm1', 'Reminders');
    expect(stateOf(oneModule, 'dependencies')).toBe('not-started');

    expect(stateOf(answer(oneModule, 'dependencies', 'dependencies', NONE_ANSWER, now), 'dependencies')).toBe('done');
  });

  it('is open again once the answer that none depend is taken back', () => {
    const oneModule = withModule(goTo(newProject(), 'users', now), 'm1', 'Reminders');
    const none = answer(oneModule, 'dependencies', 'dependencies', NONE_ANSWER, now);

    expect(stateOf(answer(none, 'dependencies', 'dependencies', '', now), 'dependencies')).toBe('not-started');
  });
});

describe('a list that needs more than one row', () => {
  function withOptions(names: readonly string[]): Project {
    return names.reduce(
      (project, name, index) =>
        updateEntity(addEntity(project, 'architecture-option', `o${index}`, now), 'architecture-option', `o${index}`, { name }, now),
      goTo(newProject(), 'users', now),
    );
  }

  it('is not complete with one alternative, since a design needs two to be compared', () => {
    const one = answer(withOptions(['Layered']), 'architecture-options', 'comparison', 'Compared', now);
    const two = answer(withOptions(['Layered', 'Event-driven']), 'architecture-options', 'comparison', 'Compared', now);

    expect(stateOf(one, 'architecture-options')).toBe('in-progress');
    expect(stateOf(two, 'architecture-options')).toBe('done');
  });

  it('does not count an alternative without a name towards the two', () => {
    const project = answer(withOptions(['Layered', '  ']), 'architecture-options', 'comparison', 'Compared', now);

    expect(openQuestions(project, stepNamed('architecture-options')).map((question) => question.id)).toEqual(['options']);
  });
});

describe('a decision', () => {
  function decided(chosen: string | undefined): Project {
    let project = goTo(newProject(), 'users', now);
    for (const [id, name] of [['o1', 'Layered'], ['o2', 'Event-driven']]) {
      project = updateEntity(addEntity(project, 'architecture-option', id, now), 'architecture-option', id, { name }, now);
    }
    project = answer(project, 'decision', 'reasons', 'It is simpler to start', now);
    return chosen ? answer(project, 'decision', 'chosen', chosen, now) : project;
  }

  it('is open until an option is chosen', () => {
    expect(openQuestions(decided(undefined), stepNamed('decision')).map((question) => question.id)).toEqual(['chosen']);
    expect(openQuestions(decided('o2'), stepNamed('decision'))).toEqual([]);
  });

  it('is open again when the chosen option is renamed to nothing, since it can no longer be picked out', () => {
    const blanked = updateEntity(decided('o2'), 'architecture-option', 'o2', { name: '' }, now);

    expect(openQuestions(blanked, stepNamed('decision')).map((question) => question.id)).toEqual(['chosen']);
  });
});
