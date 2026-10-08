import { DIAGRAM_KINDS } from '../diagrams/diagram.types';
import type { DiagramKind } from '../diagrams/diagram.types';
import { entityDefinitions } from '../entity/entity-definitions';
import { ENTITY_KINDS } from '../entity/entity.types';
import type { EntityKind } from '../entity/entity.types';
import { adjacentSteps, findQuestion, findSlice, findStep, isProjectMode, workflowFor } from './workflow';
import { PROJECT_MODES } from './workflow.types';
import type { Question } from './workflow.types';

const NEW_PROJECT_ORDER = [
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

const FEATURE_CHANGE_ORDER = [
  ['change', 'Change'],
  ['why', 'Why'],
  ['existing-behavior', 'Existing Behavior'],
  ['desired-behavior', 'Desired Behavior'],
  ['affected-concepts', 'Affected Concepts'],
  ['current-ownership', 'Current Ownership'],
  ['architecture-impact', 'Architecture Impact'],
  ['leakage-coupling-check', 'Leakage/Coupling Check'],
  ['alternatives', 'Alternatives'],
  ['recommended-design', 'Recommended Design'],
  ['tests', 'Tests'],
  ['smallest-safe-implementation', 'Smallest Safe Implementation'],
  ['refactoring', 'Refactoring'],
  ['review', 'Review'],
] as const;

describe('the workflows', () => {
  it('offers New Project and Feature / Change, each a workflow of its own', () => {
    expect(PROJECT_MODES).toEqual(['new-project', 'feature-change']);
    expect(PROJECT_MODES.map((mode) => workflowFor(mode).title)).toEqual(['New Project', 'Feature / Change']);
    for (const mode of PROJECT_MODES) {
      expect(workflowFor(mode).mode).toBe(mode);
    }
  });

  it('walks the nineteen steps of the New Project workflow, in the order the spec gives', () => {
    const workflow = workflowFor('new-project');

    expect(workflow.steps).toHaveLength(19);
    expect(workflow.steps.map((step) => [step.id, step.title])).toEqual(NEW_PROJECT_ORDER.map((step) => [...step]));
  });

  it('walks the fourteen steps of the Feature / Change workflow, in the order the spec gives', () => {
    const workflow = workflowFor('feature-change');

    expect(workflow.steps).toHaveLength(14);
    expect(workflow.steps.map((step) => [step.id, step.title])).toEqual(FEATURE_CHANGE_ORDER.map((step) => [...step]));
  });
});

describe.each(PROJECT_MODES)('the %s workflow', (mode) => {
  const workflow = workflowFor(mode);
  const steps = workflow.steps;
  const questions = steps.flatMap((step) => step.questions.map((question) => ({ step, question })));

  it('says in a sentence what it is for, so a user can choose between workflows', () => {
    expect(workflow.title.trim()).not.toBe('');
    expect(workflow.summary.trim()).not.toBe('');
  });

  it('gives every step the coaching content the wizard shows', () => {
    for (const step of steps) {
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

  it('challenges every step more than once, since the coach never just agrees', () => {
    for (const step of steps) {
      expect(step.challenges.length, step.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the framing short and the reasoning longer', () => {
    for (const step of steps) {
      expect(step.think.length, step.id).toBeLessThan(step.why.length);
    }
  });

  describe('its design package', () => {
    const files = workflow.designPackage;

    it('gathers every step into exactly one file, so no answer is left out of the export', () => {
      expect(files.flatMap((file) => file.steps)).toEqual(steps.map((step) => step.id));
    });

    it('gives each file a unique Markdown path and a title', () => {
      const paths = files.map((file) => file.path);

      expect(new Set(paths).size).toBe(paths.length);
      expect(paths.every((path) => /^[a-z]+(-[a-z]+)*\.md$/.test(path))).toBe(true);
      expect(files.every((file) => file.title.trim() !== '' && file.steps.length > 0)).toBe(true);
    });
  });

  it('keeps step ids unique, since progress and answers are keyed by them', () => {
    const ids = steps.map((step) => step.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps question ids unique within a step, since answers are keyed by them', () => {
    for (const step of steps) {
      const ids = step.questions.map((question) => question.id);
      expect(new Set(ids).size, step.id).toBe(ids.length);
    }
  });

  it('words every question as a prompt', () => {
    for (const { step, question } of questions) {
      expect(question.prompt.trim(), `${step.id}.${question.id}`).not.toBe('');
    }
  });

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

  it('lists a kind of entity from no more than one question, so there is one place to add them', () => {
    const kinds = questions.flatMap(({ question }) => (question.kind === 'entity-list' ? [question.entity] : []));

    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('edits a field of an entity from no more than one question, so two answers never fight over it', () => {
    const editors = questions.flatMap(({ question }) =>
      question.kind === 'entity-list' || question.kind === 'entity-fields'
        ? editedFields(question).map((key) => `${question.entity}.${key}`)
        : [],
    );

    expect(new Set(editors).size).toBe(editors.length);
  });

  it('never asks about rows that a later step lists, nor lets a row refer to one', () => {
    const listedIn = (kind: EntityKind): number =>
      steps.findIndex((step) =>
        step.questions.some((question) => question.kind === 'entity-list' && question.entity === kind),
      );

    steps.forEach((step, index) => {
      for (const question of step.questions) {
        if (question.kind === 'entity-fields' || question.kind === 'entity-choice') {
          const where = `${step.id}.${question.id}`;
          expect(listedIn(question.entity), `${where} has rows to work on`).toBeGreaterThanOrEqual(0);
          expect(listedIn(question.entity), where).toBeLessThanOrEqual(index);
        }
      }
    });
    for (const kind of ENTITY_KINDS) {
      for (const field of entityDefinitions[kind].fields) {
        if (field.kind === 'references' && listedIn(kind) >= 0 && fieldIsEdited(kind, field.key)) {
          expect(listedIn(field.references), `${kind}.${field.key}`).toBeGreaterThanOrEqual(0);
          expect(listedIn(field.references), `${kind}.${field.key}`).toBeLessThanOrEqual(listedIn(kind));
        }
      }
    }

    function fieldIsEdited(kind: EntityKind, key: string): boolean {
      return questions.some(
        ({ question }) =>
          (question.kind === 'entity-list' || question.kind === 'entity-fields') &&
          question.entity === kind &&
          editedFields(question).includes(key),
      );
    }
  });

  it('shows only diagrams that exist', () => {
    for (const step of steps) {
      if (step.diagram !== undefined) {
        expect(DIAGRAM_KINDS, step.id).toContain(step.diagram);
      }
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

  it('declares the slice on at most one step, since only the first such step is read', () => {
    expect(steps.filter((step) => step.slice !== undefined).length).toBeLessThanOrEqual(1);
  });

  it('shows the first-slice diagram only if it says where the slice is chosen and traced', () => {
    const shown = steps.some((step) => step.diagram === 'first-vertical-slice');

    expect(findSlice(workflow) !== undefined).toBe(shown);
  });

  it('binds the slice to questions the step really asks', () => {
    const slice = findSlice(workflow);
    if (slice) {
      expect(findQuestion(workflow, slice.stepId, slice.useCase)).toMatchObject({ kind: 'entity-choice', entity: 'use-case' });
      expect(findQuestion(workflow, slice.stepId, slice.path)?.kind).toBe('long-text');
    }
  });
});

describe('the definitions of the entities a workflow lists', () => {
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
});

describe('the New Project workflow', () => {
  const steps = workflowFor('new-project').steps;
  const questions = steps.flatMap((step) => step.questions.map((question) => ({ step, question })));

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

  it('shows every kind of diagram on at least one step', () => {
    const shown = new Set(steps.map((step) => step.diagram));

    for (const kind of DIAGRAM_KINDS) {
      expect(shown, kind).toContain(kind);
    }
  });

  it('chooses and traces the first slice on the First Vertical Slice step', () => {
    expect(findSlice(workflowFor('new-project'))).toEqual({
      stepId: 'first-vertical-slice',
      useCase: 'use-case',
      path: 'path',
    });
  });
});

describe('the Feature / Change workflow', () => {
  const workflow = workflowFor('feature-change');

  function questionsOf(stepId: string): readonly Question[] {
    return findStep(workflow, stepId)?.questions ?? [];
  }

  it('reuses the entity kinds for the steps that capture structure', () => {
    expect(questionsOf('affected-concepts')).toContainEqual(expect.objectContaining({ kind: 'entity-list', entity: 'concept' }));
    expect(questionsOf('current-ownership')).toContainEqual(expect.objectContaining({ kind: 'entity-list', entity: 'module' }));
    expect(questionsOf('alternatives')).toContainEqual(
      expect.objectContaining({ kind: 'entity-list', entity: 'architecture-option' }),
    );
    expect(questionsOf('recommended-design')).toContainEqual(
      expect.objectContaining({ kind: 'entity-choice', entity: 'architecture-option' }),
    );
  });

  it('asks what each module owns and hides today, not just its name', () => {
    const asked = questionsOf('current-ownership').flatMap((question) =>
      question.kind === 'entity-list' ? editedFields(question) : [],
    );

    expect(asked).toContain('hides');
  });

  it('asks for two alternatives before one is recommended, as design-it-twice needs', () => {
    expect(questionsOf('alternatives')).toContainEqual(
      expect.objectContaining({ kind: 'entity-list', entity: 'architecture-option', minimum: 2 }),
    );
  });

  it('offers an explicit "none" only where an unchanged dependency list is a real answer', () => {
    const offered = workflow.steps.flatMap((step) =>
      step.questions.flatMap((question) =>
        question.kind === 'entity-fields' && question.noneLabel !== undefined ? [[step.id, question.field]] : [],
      ),
    );

    expect(offered).toEqual([['architecture-impact', 'dependsOn']]);
  });

  it('declares the diagram that helps with each step that captures structure', () => {
    const shown = Object.fromEntries(workflow.steps.map((step) => [step.id, step.diagram]));

    expect(shown['affected-concepts']).toBe('domain-model');
    expect(shown['current-ownership']).toBe('module');
    expect(shown['architecture-impact']).toBe('dependency');
    expect(shown['smallest-safe-implementation']).toBe('first-vertical-slice');
  });

  it('chooses and traces the smallest safe slice on the Smallest Safe Implementation step', () => {
    expect(findSlice(workflow)).toEqual({ stepId: 'smallest-safe-implementation', useCase: 'use-case', path: 'path' });
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
    expect(isProjectMode('feature-change')).toBe(true);
    expect(isProjectMode('toString')).toBe(false);
    expect(isProjectMode(3)).toBe(false);
  });
});
