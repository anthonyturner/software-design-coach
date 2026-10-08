import { DIAGRAM_KINDS } from '../diagrams/diagram.types';
import type { DiagramKind } from '../diagrams/diagram.types';
import { entityDefinitions } from '../entity/entity-definitions';
import { ENTITY_KINDS } from '../entity/entity.types';
import type { EntityKind } from '../entity/entity.types';
import { adjacentSteps, findQuestion, findStep, isProjectMode, workflowFor } from './workflow';
import type { Question } from './workflow.types';

const SPEC_ORDER = [
  ['problem', 'Problem'],
  ['users', 'Users'],
  ['goals', 'Goals'],
  ['non-goals', 'Non-goals'],
  ['requirements', 'Requirements'],
  ['use-cases', 'Use Cases'],
  ['domain-concepts', 'Domain Concepts'],
  ['system-boundary', 'System Boundary'],
  ['modules', 'Modules'],
  ['responsibilities', 'Responsibilities'],
  ['information-hiding', 'Information Hiding'],
  ['interfaces', 'Interfaces'],
  ['dependencies', 'Dependencies'],
  ['architecture-options', 'Architecture Options'],
  ['decision', 'Decision'],
  ['first-vertical-slice', 'First Vertical Slice'],
  ['tests', 'Tests'],
  ['implementation-plan', 'Implementation Plan'],
  ['design-review', 'Design Review'],
] as const;

describe('workflowFor', () => {
  const workflow = workflowFor('new-project');

  it('walks the nineteen steps of the New Project workflow, in the order the spec gives', () => {
    expect(workflow.steps).toHaveLength(19);
    expect(workflow.steps.map((step) => [step.id, step.title])).toEqual(SPEC_ORDER.map((step) => [...step]));
  });

  it('gives every step the coaching content the wizard shows', () => {
    for (const step of workflow.steps) {
      for (const text of [step.title, step.think, step.why, step.example]) {
        expect(text.trim(), step.id).not.toBe('');
      }
      expect(step.challenges.length, step.id).toBeGreaterThan(0);
      expect(
        step.challenges.every((challenge) => challenge.trim() !== ''),
        step.id,
      ).toBe(true);
      expect(step.questions.length, step.id).toBeGreaterThan(0);
    }
  });

  it('keeps the framing short and the reasoning longer', () => {
    for (const step of workflow.steps) {
      expect(step.think.length, step.id).toBeLessThan(step.why.length);
    }
  });

  it('keeps step ids unique, since progress and answers are keyed by them', () => {
    const ids = workflow.steps.map((step) => step.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps question ids unique within a step, since answers are keyed by them', () => {
    for (const step of workflow.steps) {
      const ids = step.questions.map((question) => question.id);
      expect(new Set(ids).size, step.id).toBe(ids.length);
    }
  });

  it('words every question as a prompt', () => {
    for (const step of workflow.steps) {
      for (const question of step.questions) {
        expect(question.prompt.trim(), `${step.id}.${question.id}`).not.toBe('');
      }
    }
  });
});

describe('the questions each step asks', () => {
  const steps = workflowFor('new-project').steps;
  const questions = steps.flatMap((step) => step.questions.map((question) => ({ step, question })));

  it('asks at least one question a step cannot be done without', () => {
    for (const step of steps) {
      expect(
        step.questions.some((question) => !question.optional),
        step.id,
      ).toBe(true);
    }
  });

  it('offers a choice at least two options, each distinct', () => {
    const choices = questions.flatMap(({ question }) => (question.kind === 'choice' ? [question] : []));

    expect(choices.length).toBeGreaterThan(0);
    for (const choice of choices) {
      const values = choice.options.map((option) => option.value);
      expect(values.length, choice.id).toBeGreaterThanOrEqual(2);
      expect(new Set(values).size, choice.id).toBe(values.length);
    }
  });

  it('gives every kind of entity a definition whose references point at kinds that exist', () => {
    for (const kind of ENTITY_KINDS) {
      const definition = entityDefinitions[kind];
      expect(definition.nameLabel, kind).not.toBe('');
      const keys = definition.fields.map((field) => field.key);
      expect(new Set(keys).size, kind).toBe(keys.length);
      for (const field of definition.fields) {
        if (field.kind === 'references') {
          expect(ENTITY_KINDS, `${kind}.${field.key}`).toContain(field.references);
        }
      }
    }
  });

  it('names only kinds of entity and fields that exist', () => {
    for (const { step, question } of questions) {
      if (question.kind === 'entity-list' || question.kind === 'entity-fields' || question.kind === 'entity-choice') {
        const where = `${step.id}.${question.id}`;
        expect(ENTITY_KINDS, where).toContain(question.entity);
        const known = entityDefinitions[question.entity].fields.map((field) => field.key);
        for (const key of editedFields(question)) {
          expect(known, where).toContain(key);
        }
      }
    }
  });

  it('lists each kind of entity from exactly one question, so there is one place to add them', () => {
    const kinds = questions.flatMap(({ question }) => (question.kind === 'entity-list' ? [question.entity] : []));

    expect([...kinds].sort()).toEqual([...ENTITY_KINDS].sort());
  });

  it('edits every field of every kind of entity from exactly one question', () => {
    const editors = questions
      .flatMap(({ question }) =>
        question.kind === 'entity-list' || question.kind === 'entity-fields'
          ? editedFields(question).map((key) => `${question.entity}.${key}`)
          : [],
      )
      .sort();
    const everyField = ENTITY_KINDS.flatMap((kind) => entityDefinitions[kind].fields.map((field) => `${kind}.${field.key}`));

    expect(editors).toEqual(everyField.sort());
  });

  it('never asks about rows that a later step lists, nor lets a row refer to one', () => {
    const listedIn = (kind: EntityKind): number =>
      steps.findIndex((step) =>
        step.questions.some((question) => question.kind === 'entity-list' && question.entity === kind),
      );

    steps.forEach((step, index) => {
      for (const question of step.questions) {
        if (question.kind === 'entity-fields' || question.kind === 'entity-choice') {
          expect(listedIn(question.entity), `${step.id}.${question.id}`).toBeLessThanOrEqual(index);
        }
      }
    });
    for (const kind of ENTITY_KINDS) {
      for (const field of entityDefinitions[kind].fields) {
        if (field.kind === 'references') {
          expect(listedIn(field.references), `${kind}.${field.key}`).toBeLessThanOrEqual(listedIn(kind));
        }
      }
    }
  });

  it('offers an explicit "none" only where listing nothing is a real answer', () => {
    const offered = questions.flatMap(({ step, question }) =>
      question.kind === 'entity-fields' && question.noneLabel !== undefined ? [[step.id, question.field]] : [],
    );

    expect(offered).toEqual([['dependencies', 'dependsOn']]);
  });

  it('asks for more than one row only where a minimum says so, as design-it-twice needs two options', () => {
    const minimums = questions.flatMap(({ question }) =>
      question.kind === 'entity-list' && question.minimum !== undefined ? [[question.entity, question.minimum]] : [],
    );

    expect(minimums).toEqual([['architecture-option', 2]]);
  });
});

describe('the diagram each step shows', () => {
  const steps = workflowFor('new-project').steps;

  it('names only diagrams that exist', () => {
    for (const step of steps) {
      if (step.diagram !== undefined) {
        expect(DIAGRAM_KINDS, step.id).toContain(step.diagram);
      }
    }
  });

  it('shows every kind of diagram on at least one step', () => {
    const shown = new Set(steps.map((step) => step.diagram));

    for (const kind of DIAGRAM_KINDS) {
      expect(shown, kind).toContain(kind);
    }
  });

  it('shows a diagram only once a step at or before it lists something for the diagram to draw', () => {
    const drawnFrom: Readonly<Record<DiagramKind, readonly EntityKind[]>> = {
      'system-context': ['actor', 'external-system'],
      'use-case': ['actor', 'use-case'],
      'domain-model': ['concept'],
      module: ['module'],
      dependency: ['module'],
      'first-vertical-slice': ['use-case'],
    };

    steps.forEach((step, index) => {
      if (step.diagram !== undefined) {
        const listed = steps
          .slice(0, index + 1)
          .flatMap((earlier) => earlier.questions.flatMap((question) => (question.kind === 'entity-list' ? [question.entity] : [])));
        expect(
          drawnFrom[step.diagram].some((kind) => listed.includes(kind)),
          step.id,
        ).toBe(true);
      }
    });
  });
});

function editedFields(question: Question): readonly string[] {
  switch (question.kind) {
    case 'entity-list':
      return question.fields ?? entityDefinitions[question.entity].fields.map((field) => field.key);
    case 'entity-fields':
      return [question.field];
    default:
      return [];
  }
}

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
    const { previous, next } = adjacentSteps(workflow, 'design-review');

    expect(previous?.id).toBe('implementation-plan');
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
