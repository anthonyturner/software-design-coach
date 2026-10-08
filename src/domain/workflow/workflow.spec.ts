import { adjacentSteps, findQuestion, findStep, isProjectMode, workflowFor } from './workflow';

describe('workflowFor', () => {
  const workflow = workflowFor('new-project');

  it('walks Problem, Users and Goals in that order', () => {
    expect(workflow.steps.map((step) => step.id)).toEqual(['problem', 'users', 'goals']);
  });

  it('gives every step the coaching content the wizard shows', () => {
    for (const step of workflow.steps) {
      expect(step.title, step.id).not.toBe('');
      expect(step.why, step.id).not.toBe('');
      expect(step.example, step.id).not.toBe('');
      expect(step.challenges.length, step.id).toBeGreaterThan(0);
      expect(step.questions.length, step.id).toBeGreaterThan(0);
    }
  });

  it('keeps question ids unique within a step, since answers are keyed by them', () => {
    for (const step of workflow.steps) {
      const ids = step.questions.map((question) => question.id);
      expect(new Set(ids).size, step.id).toBe(ids.length);
    }
  });
});

describe('finding things in a workflow', () => {
  const workflow = workflowFor('new-project');

  it('finds a step by id', () => {
    expect(findStep(workflow, 'users')?.title).toBe('Users');
  });

  it('finds no step for an unknown id', () => {
    expect(findStep(workflow, 'nope')).toBeUndefined();
  });

  it('finds a question within a step', () => {
    const first = workflow.steps[0].questions[0];

    expect(findQuestion(workflow, 'problem', first.id)).toBe(first);
  });

  it('finds no question for an unknown step or question id', () => {
    expect(findQuestion(workflow, 'nope', 'problem')).toBeUndefined();
    expect(findQuestion(workflow, 'problem', 'nope')).toBeUndefined();
  });
});

describe('adjacentSteps', () => {
  const workflow = workflowFor('new-project');

  it('has no previous step at the start', () => {
    const { previous, next } = adjacentSteps(workflow, 'problem');

    expect(previous).toBeUndefined();
    expect(next?.id).toBe('users');
  });

  it('has both neighbours in the middle', () => {
    const { previous, next } = adjacentSteps(workflow, 'users');

    expect(previous?.id).toBe('problem');
    expect(next?.id).toBe('goals');
  });

  it('has no next step at the end', () => {
    const { previous, next } = adjacentSteps(workflow, 'goals');

    expect(previous?.id).toBe('users');
    expect(next).toBeUndefined();
  });

  it('has no neighbours for an unknown step', () => {
    expect(adjacentSteps(workflow, 'nope')).toEqual({ previous: undefined, next: undefined });
  });
});

describe('isProjectMode', () => {
  it('knows the modes that have a workflow', () => {
    expect(isProjectMode('new-project')).toBe(true);
    expect(isProjectMode('toString')).toBe(false);
    expect(isProjectMode(3)).toBe(false);
  });
});
