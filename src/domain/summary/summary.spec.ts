import { diagramFor } from '../diagrams/diagrams';
import { addEntity, answer, createProject, goTo, NONE_ANSWER, setNote, updateEntity } from '../project/project';
import type { Project } from '../project/project.types';
import { workflowFor } from '../workflow/workflow';
import type { EntityEdit, EntityKind } from '../entity/entity.types';
import type { ProjectMode } from '../workflow/workflow.types';
import { summaryOf } from './summary';
import type { SummaryStep } from './summary.types';

const now = '2026-10-08T09:00:00.000Z';

function newProject(mode: ProjectMode = 'new-project'): Project {
  return createProject({ id: 'p1', name: 'Reminders', mode, now });
}

function withRow(project: Project, kind: EntityKind, id: string, edit: EntityEdit): Project {
  return updateEntity(addEntity(project, kind, id, now), kind, id, edit, now);
}

function step(project: Project, stepId: string): SummaryStep {
  const found = summaryOf(project).steps.find((candidate) => candidate.stepId === stepId);
  if (!found) {
    throw new Error(`The summary should have a step "${stepId}"`);
  }
  return found;
}

describe('summaryOf', () => {
  describe('the shape of the whole design', () => {
    it.each(['new-project', 'feature-change'] as const)('has every step of the %s workflow, in order, numbered from 1', (mode) => {
      const summary = summaryOf(newProject(mode));
      const workflow = workflowFor(mode);

      expect(summary.steps.map((s) => s.stepId)).toEqual(workflow.steps.map((s) => s.id));
      expect(summary.steps.map((s) => s.number)).toEqual(workflow.steps.map((_, index) => index + 1));
      expect(summary.steps.map((s) => s.title)).toEqual(workflow.steps.map((s) => s.title));
      expect(summary.stepCount).toBe(workflow.steps.length);
      expect(summary.workflowTitle).toBe(workflow.title);
    });

    it('names the project', () => {
      expect(summaryOf(newProject()).projectName).toBe('Reminders');
    });

    it('marks every step open, and lists what it still needs, in a project with nothing answered', () => {
      const summary = summaryOf(newProject());

      expect(summary.answeredCount).toBe(0);
      expect(summary.steps.every((s) => s.state === 'open' && s.answers.length === 0 && s.note === '')).toBe(true);
      expect(step(newProject(), 'problem').openPrompts).toEqual([
        'What problem are we solving, in plain words, without naming a solution?',
        'Who feels it today, and how do they cope without this?',
        'How will you know the problem is solved?',
      ]);
    });

    it('does not treat the step the user is on any differently from the others', () => {
      const project = goTo(newProject(), 'goals', now);

      expect(step(project, 'goals').state).toBe('open');
    });

    it('counts a step as answered once every required question has an answer, and not before', () => {
      let project = answer(newProject(), 'problem', 'problem', 'No-shows cost us chairs', now);
      project = answer(project, 'problem', 'pain', 'A printed schedule', now);

      expect(step(project, 'problem').state).toBe('open');
      expect(step(project, 'problem').openPrompts).toEqual(['How will you know the problem is solved?']);

      project = answer(project, 'problem', 'success', 'Fewer than one in ten', now);

      expect(step(project, 'problem').state).toBe('answered');
      expect(step(project, 'problem').openPrompts).toEqual([]);
      expect(summaryOf(project).answeredCount).toBe(1);
    });

    it('calls a step answered without its optional questions', () => {
      const project = withRow(newProject(), 'actor', 'a1', { name: 'Receptionist' });

      expect(step(project, 'users')).toMatchObject({ state: 'answered', openPrompts: [] });
    });

    it('works for a Feature / Change project', () => {
      const project = answer(newProject('feature-change'), 'why', 'value', 'The desk stops phoning', now);

      expect(step(project, 'why').answers).toEqual([
        {
          questionId: 'value',
          prompt: 'Who benefits, and what can they do or avoid because of it?',
          body: { kind: 'text', text: 'The desk stops phoning' },
        },
      ]);
    });
  });

  describe('the answers on a step', () => {
    it('shows the answers that exist, in the order the questions are asked, and leaves out the rest', () => {
      let project = answer(newProject(), 'problem', 'success', 'Fewer than one in ten', now);
      project = answer(project, 'problem', 'problem', 'No-shows cost us chairs', now);

      expect(step(project, 'problem').answers.map((a) => a.questionId)).toEqual(['problem', 'success']);
    });

    it('shows a short or long answer as text, trimmed, and leaves out one that is only blank', () => {
      let project = answer(newProject(), 'problem', 'problem', '  Chairs sit empty\nevery week  ', now);
      project = answer(project, 'problem', 'pain', '   ', now);

      expect(step(project, 'problem').answers).toEqual([
        {
          questionId: 'problem',
          prompt: 'What problem are we solving, in plain words, without naming a solution?',
          body: { kind: 'text', text: 'Chairs sit empty\nevery week' },
        },
      ]);
    });

    it('shows a list answer as a list, with blank lines dropped', () => {
      const project = answer(newProject(), 'goals', 'goals', ['fewer no-shows', '  ', ' no calls '], now);

      expect(step(project, 'goals').answers[0].body).toEqual({ kind: 'list', items: ['fewer no-shows', 'no calls'] });
    });

    it('leaves out a list with nothing in it', () => {
      expect(step(answer(newProject(), 'goals', 'goals', [], now), 'goals').answers).toEqual([]);
    });

    it('shows a choice by its label, not its stored value', () => {
      const project = answer(newProject('feature-change'), 'change', 'kind', 'altered', now);

      expect(step(project, 'change').answers[0].body).toEqual({
        kind: 'text',
        text: 'Altered: something it does, done differently',
      });
    });

    it('shows the row an entity choice picked by its name', () => {
      let project = withRow(newProject(), 'architecture-option', 'o1', { name: ' Four modules ' });
      project = withRow(project, 'architecture-option', 'o2', { name: 'One module' });
      project = answer(project, 'decision', 'chosen', 'o1', now);

      expect(step(project, 'decision').answers[0].body).toEqual({ kind: 'text', text: 'Four modules' });
    });
  });

  describe('entity lists', () => {
    it('shows each named row by name, and skips a row with no name yet', () => {
      let project = withRow(newProject(), 'actor', 'a1', { name: 'Receptionist' });
      project = withRow(project, 'actor', 'a2', { name: 'Patient' });
      project = addEntity(project, 'actor', 'a3', now);

      const [users] = step(project, 'users').answers;

      expect(users.body).toMatchObject({ kind: 'rows', rows: [{ name: 'Receptionist' }, { name: 'Patient' }] });
    });

    it('shows the fields that have something in them, with their labels, and not the empty ones', () => {
      const project = withRow(newProject(), 'actor', 'a1', { name: 'Receptionist', fields: { needs: 'Stop phoning' } });
      const withEmpty = withRow(project, 'actor', 'a2', { name: 'Patient' });

      expect(step(withEmpty, 'users').answers[0].body).toEqual({
        kind: 'rows',
        rows: [
          {
            name: 'Receptionist',
            fields: [{ label: 'What are they trying to get done?', value: { kind: 'text', text: 'Stop phoning' } }],
          },
          { name: 'Patient', fields: [] },
        ],
      });
    });

    it('shows only the fields the question edits, in the order the row defines them', () => {
      const project = withRow(newProject(), 'module', 'm1', {
        name: 'Reminders',
        fields: { purpose: 'Decides when one is due', hides: 'The timing rules' },
      });

      const body = step(project, 'modules').answers[0].body;

      expect(body).toMatchObject({ kind: 'rows', rows: [{ name: 'Reminders' }] });
      expect(body.kind === 'rows' && body.rows[0].fields.map((field) => field.label)).toEqual([
        'What does it own, in one sentence?',
      ]);
    });

    it('shows a list field as a list, and a reference by the name of the row it points at, leaving out a row with no name as the lists do', () => {
      let project = withRow(newProject(), 'actor', 'a1', { name: 'Receptionist' });
      project = withRow(project, 'actor', 'a2', { name: 'Patient' });
      project = addEntity(project, 'actor', 'a3', now);
      project = withRow(project, 'use-case', 'u1', { name: 'Book a visit', fields: { actors: ['a2', 'a1', 'a3'] } });

      const body = step(project, 'use-cases').answers[0].body;

      expect(body).toEqual({
        kind: 'rows',
        rows: [
          {
            name: 'Book a visit',
            fields: [{ label: 'Who performs it?', value: { kind: 'list', items: ['Patient', 'Receptionist'] } }],
          },
        ],
      });
    });

    it('leaves out a list with no named row', () => {
      expect(step(addEntity(newProject(), 'actor', 'a1', now), 'users').answers).toEqual([]);
    });

    it('follows a rename of a row that others refer to', () => {
      let project = withRow(newProject(), 'actor', 'a1', { name: 'Receptionist' });
      project = withRow(project, 'use-case', 'u1', { name: 'Book a visit', fields: { actors: ['a1'] } });
      project = updateEntity(project, 'actor', 'a1', { name: 'Front desk' }, now);

      const body = step(project, 'use-cases').answers[0].body;

      expect(body.kind === 'rows' && body.rows[0].fields[0].value).toEqual({ kind: 'list', items: ['Front desk'] });
    });
  });

  describe('a field edited across rows', () => {
    it('shows one value for each named row that has one', () => {
      let project = withRow(newProject(), 'module', 'm1', { name: 'Reminders', fields: { responsibilities: ['Decide when due', ' '] } });
      project = withRow(project, 'module', 'm2', { name: 'Messaging' });
      project = withRow(project, 'module', 'm3', { name: 'Storage', fields: { responsibilities: ['Keep rows'] } });

      expect(step(project, 'responsibilities').answers).toEqual([
        {
          questionId: 'responsibilities',
          prompt: 'What is each module responsible for?',
          body: {
            kind: 'entries',
            entries: [
              { name: 'Reminders', value: { kind: 'list', items: ['Decide when due'] } },
              { name: 'Storage', value: { kind: 'list', items: ['Keep rows'] } },
            ],
          },
        },
      ]);
    });

    it('shows references by name', () => {
      let project = withRow(newProject(), 'module', 'm1', { name: 'Reminders' });
      project = withRow(project, 'module', 'm2', { name: 'Messaging' });
      project = updateEntity(project, 'module', 'm1', { fields: { dependsOn: ['m2'] } }, now);

      expect(step(project, 'dependencies').answers[0].body).toEqual({
        kind: 'entries',
        entries: [{ name: 'Reminders', value: { kind: 'list', items: ['Messaging'] } }],
      });
    });

    it('says what the user ticked when they answered that no row has anything to list', () => {
      let project = withRow(newProject(), 'module', 'm1', { name: 'Reminders' });
      project = answer(project, 'dependencies', 'dependencies', NONE_ANSWER, now);

      expect(step(project, 'dependencies').answers[0].body).toEqual({ kind: 'text', text: 'No module depends on another' });
    });

    it('leaves the question out while nothing is written and nothing was ticked', () => {
      const project = withRow(newProject(), 'module', 'm1', { name: 'Reminders' });

      expect(step(project, 'dependencies').answers).toEqual([]);
    });
  });

  describe('notes', () => {
    it('carries the note on a step exactly as typed', () => {
      const project = setNote(newProject(), 'goals', 'Ask finance\nabout budget ', now);

      expect(step(project, 'goals').note).toBe('Ask finance\nabout budget ');
    });

    it('carries the note of a step that is still open, so a note is never lost to an unfinished step', () => {
      const project = setNote(newProject(), 'goals', 'Not sure yet', now);

      expect(step(project, 'goals')).toMatchObject({ state: 'open', note: 'Not sure yet', answers: [] });
    });

    it('keeps each note on its own step', () => {
      let project = setNote(newProject(), 'goals', 'about goals', now);
      project = setNote(project, 'users', 'about users', now);

      expect(summaryOf(project).steps.filter((s) => s.note !== '').map((s) => [s.stepId, s.note])).toEqual([
        ['users', 'about users'],
        ['goals', 'about goals'],
      ]);
    });
  });

  describe('diagrams', () => {
    it('gives a step its diagram, drawn from the same model, once there is something to draw', () => {
      const project = withRow(newProject(), 'module', 'm1', { name: 'Reminders' });

      expect(step(project, 'modules').diagram).toEqual({
        kind: 'module',
        title: 'Modules',
        source: diagramFor(project, 'module'),
      });
      expect(step(project, 'dependencies').diagram).toMatchObject({ kind: 'dependency', title: 'Dependencies' });
    });

    it('gives none while the model has nothing for the diagram to draw', () => {
      expect(step(newProject(), 'modules').diagram).toBeUndefined();
    });

    it('gives none to a step that shows no diagram', () => {
      const project = withRow(newProject(), 'module', 'm1', { name: 'Reminders' });

      expect(step(project, 'goals').diagram).toBeUndefined();
    });

    it('gives a step that is still open its diagram too', () => {
      const project = withRow(newProject(), 'actor', 'a1', { name: 'Receptionist' });

      expect(step(project, 'users').diagram?.kind).toBe('system-context');
    });

    it('gives each step its own diagram even when several steps show the same kind', () => {
      const project = withRow(newProject(), 'module', 'm1', { name: 'Reminders' });
      const kinds = summaryOf(project).steps.filter((s) => s.diagram?.kind === 'module').map((s) => s.stepId);

      expect(kinds).toEqual(['modules', 'responsibilities', 'information-hiding', 'interfaces']);
    });
  });

  it('does not change the project it is given', () => {
    const project = withRow(setNote(newProject(), 'goals', 'a note', now), 'actor', 'a1', { name: 'Receptionist' });
    const before = JSON.stringify(project);

    summaryOf(project);

    expect(JSON.stringify(project)).toBe(before);
  });
});
