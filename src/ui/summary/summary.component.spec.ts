import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import { DIAGRAM_RENDERER } from '../../app/diagram-renderer';
import { PROJECT_REPOSITORY } from '../../app/project-repository';
import { FakeDiagramRenderer } from '../../app/testing/fake-diagram-renderer';
import { InMemoryProjectRepository } from '../../app/testing/in-memory-project-repository';
import { addEntity, answer, createProject, setNote, summaryOf, updateEntity, workflowFor } from '../../domain';
import type { EntityEdit, EntityKind, Project } from '../../domain';
import { FileExporter } from '../../infrastructure/files/file-exporter';
import { FakeFileExporter } from '../../infrastructure/files/testing/fake-file-exporter';
import { SummaryComponent } from './summary.component';

const now = '2026-10-08T09:00:00.000Z';

function withRow(project: Project, kind: EntityKind, id: string, edit: EntityEdit): Project {
  return updateEntity(addEntity(project, kind, id, now), kind, id, edit, now);
}

/** A project part way through: Problem answered, two actors and a use case, two modules wired together, notes on two steps. */
function reminders(): Project {
  let project = createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now });
  project = answer(project, 'problem', 'problem', 'No-shows cost us chairs', now);
  project = answer(project, 'problem', 'pain', 'A printed schedule and a pen', now);
  project = answer(project, 'problem', 'success', 'Fewer than one in ten', now);
  project = answer(project, 'goals', 'goals', ['fewer no-shows', 'no reminder calls'], now);
  project = withRow(project, 'actor', 'a1', { name: 'Receptionist', fields: { needs: 'Stop phoning' } });
  project = withRow(project, 'actor', 'a2', { name: 'Patient' });
  project = withRow(project, 'use-case', 'u1', { name: 'Confirm a visit', fields: { actors: ['a2', 'a1'] } });
  project = withRow(project, 'module', 'm1', { name: 'Reminders', fields: { purpose: 'Decides when one is due' } });
  project = withRow(project, 'module', 'm2', { name: 'Messaging' });
  project = updateEntity(project, 'module', 'm1', { fields: { dependsOn: ['m2'] } }, now);
  project = setNote(project, 'goals', 'Ask finance\nabout the budget', now);
  return setNote(project, 'design-review', 'Is Messaging deep enough?', now);
}

describe('SummaryComponent', () => {
  let repository: InMemoryProjectRepository;
  let diagrams: FakeDiagramRenderer;
  let exporter: FakeFileExporter;
  let harness: RouterTestingHarness;

  async function open(project: Project): Promise<HTMLElement> {
    await repository.save(project);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/projects/${project.id}/summary`, SummaryComponent);
    await settle();
    await settle();
    return page();
  }

  function page(): HTMLElement {
    if (!(harness.routeNativeElement instanceof HTMLElement)) {
      throw new Error('the routed component should be rendered');
    }
    return harness.routeNativeElement;
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  }

  const text = (selector: string, scope: ParentNode = page()): string | undefined =>
    scope.querySelector(selector)?.textContent?.trim();
  const all = (selector: string, scope: ParentNode = page()): (string | undefined)[] =>
    [...scope.querySelectorAll(selector)].map((found) => found.textContent?.trim());
  const stepBlock = (title: string): HTMLElement => {
    const found = [...page().querySelectorAll<HTMLElement>('.summary__step')].find(
      (block) => block.querySelector('h3')?.textContent?.includes(title),
    );
    if (!found) {
      throw new Error(`No step "${title}" on the summary`);
    }
    return found;
  };

  beforeEach(() => {
    repository = new InMemoryProjectRepository();
    diagrams = new FakeDiagramRenderer();
    exporter = new FakeFileExporter();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: PROJECT_REPOSITORY, useValue: repository },
        { provide: DIAGRAM_RENDERER, useValue: diagrams },
        { provide: FileExporter, useValue: exporter },
      ],
    });
  });

  describe('the page', () => {
    it('names the project and the workflow, and says how far the design has got', async () => {
      await open(reminders());

      expect(text('h2')).toBe('Reminders');
      expect(text('.summary__mode')).toBe('New Project · design summary');
      const answered = all('.summary__state').filter((state) => state === 'Answered').length;
      expect(answered).toBeGreaterThan(1);
      expect(text('.summary__progress')).toBe(`${answered} of 19 steps answered`);
    });

    it('has one heading for the project, one for each step, and one for each thing under a step', async () => {
      const summary = await open(reminders());

      expect(summary.querySelectorAll('h1')).toHaveLength(0);
      expect(summary.querySelectorAll('h2')).toHaveLength(1);
      expect(all('h3')).toHaveLength(19);
      expect(summary.querySelectorAll('h5')).toHaveLength(0);
    });

    it('lists every step, in workflow order and numbered, answered or not', async () => {
      await open(reminders());

      expect(all('.summary__step h3')).toEqual(workflowFor('new-project').steps.map((step, index) => `${index + 1}. ${step.title}`));
    });

    it('is an article labelled by the project name', async () => {
      const summary = await open(reminders());
      const article = summary.querySelector('article');

      expect(article?.getAttribute('aria-labelledby')).toBe(summary.querySelector('h2')?.id);
    });

    it('works for a Feature / Change project too, in its own order', async () => {
      let project = createProject({ id: 'f1', name: 'Cancel by text', mode: 'feature-change', now });
      project = answer(project, 'why', 'value', 'The desk stops phoning', now);
      await open(project);

      expect(text('.summary__mode')).toBe('Feature / Change · design summary');
      expect(all('.summary__step h3')).toHaveLength(14);
      expect(text('p', stepBlock('Why'))).toBeDefined();
      expect(stepBlock('Why').textContent).toContain('The desk stops phoning');
    });

    it('says when the project is not in this browser', async () => {
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/projects/missing/summary', SummaryComponent);
      await settle();

      expect(page().textContent).toContain('This project is not in this browser');
      expect(page().querySelector('article')).toBeNull();
    });
  });

  describe('a step', () => {
    it('is marked answered once its required questions are answered', async () => {
      await open(reminders());

      expect(text('.summary__state', stepBlock('Problem'))).toBe('Answered');
    });

    it('is marked open, with the questions still to answer, when it is not finished', async () => {
      await open(reminders());
      const goals = stepBlock('Non-goals');

      expect(text('.summary__state', goals)).toBe('Open');
      expect(all('.summary__open li', goals)).toEqual([
        workflowFor('new-project').steps.find((step) => step.id === 'non-goals')?.questions[0].prompt,
      ]);
    });

    it('is kept, with what it holds, when it is only partly answered', async () => {
      await open(answer(createProject({ id: 'p1', name: 'R', mode: 'new-project', now }), 'problem', 'problem', 'Chairs', now));

      expect(text('.summary__state', stepBlock('Problem'))).toBe('Open');
      expect(stepBlock('Problem').textContent).toContain('Chairs');
    });

    it('shows each answer under its question, as a paragraph or a list', async () => {
      await open(reminders());
      const problem = stepBlock('Problem');
      const goals = stepBlock('Goals');

      expect(all('h4', problem)).toEqual([
        'What problem are we solving, in plain words, without naming a solution?',
        'Who feels it today, and how do they cope without this?',
        'How will you know the problem is solved?',
      ]);
      expect(problem.textContent).toContain('No-shows cost us chairs');
      expect(all('.value__list li', goals)).toEqual(['fewer no-shows', 'no reminder calls']);
    });

    it('shows each listed row by name, with its filled-in fields and references by name', async () => {
      await open(reminders());
      const users = stepBlock('Users');
      const useCases = stepBlock('Use Cases');

      expect(all('.summary__row-name', users)).toEqual(['Receptionist', 'Patient']);
      expect(users.textContent).toContain('Stop phoning');
      expect(all('.summary__row-name', useCases)).toEqual(['Confirm a visit']);
      expect(all('.summary__row li', useCases)).toEqual(['Patient', 'Receptionist']);
      expect(useCases.textContent).not.toMatch(/\ba[12]\b/);
    });

    it('shows a field written for each module as the module name and what it says', async () => {
      await open(reminders());

      const dependencies = stepBlock('Dependencies');

      expect(all('.summary__entry-name', dependencies)).toEqual(['Reminders']);
      expect(all('.summary__entries li', dependencies)).toEqual(['Messaging']);
    });

    it('shows the note written on it, keeping its line breaks', async () => {
      await open(reminders());
      const goals = stepBlock('Goals');

      expect(all('h4', goals)).toContain('Notes');
      expect(text('.summary__note', goals)).toBe('Ask finance\nabout the budget');
    });

    it('shows a note on a step that is still open', async () => {
      await open(reminders());

      expect(text('.summary__note', stepBlock('Design Review'))).toBe('Is Messaging deep enough?');
      expect(text('.summary__state', stepBlock('Design Review'))).toBe('Open');
    });

    it('has no Notes heading on a step with no note', async () => {
      await open(reminders());

      expect(all('h4', stepBlock('Problem'))).not.toContain('Notes');
    });
  });

  describe('diagrams', () => {
    it('draws the diagram of each step that has something to draw, from the same model', async () => {
      await open(reminders());
      const expected = summaryOf(reminders()).steps.flatMap((step) => (step.diagram ? [step.diagram.source] : []));

      expect(expected.length).toBeGreaterThan(3);
      expect(diagrams.drawings.map((drawing) => drawing.source).sort()).toEqual([...expected].sort());
    });

    it('shows a diagram inside the step it belongs to, titled, and none in a step that has nothing to draw', async () => {
      await open(reminders());

      expect(stepBlock('Modules').querySelector('sdc-diagram-panel')).not.toBeNull();
      expect(text('.diagram__caption', stepBlock('Modules'))).toBe('Modules');
      expect(stepBlock('Goals').querySelector('sdc-diagram-panel')).toBeNull();
      expect(stepBlock('Tests').querySelector('sdc-diagram-panel')).toBeNull();
    });

    it('puts the diagram under a heading one level below the step title, and gives every region its own id', async () => {
      const summary = await open(reminders());
      const ids = all('.diagram__label', summary).length;
      const unique = new Set([...summary.querySelectorAll('.diagram__label')].map((found) => found.id));

      expect(summary.querySelectorAll('.diagram h3')).toHaveLength(0);
      expect(summary.querySelectorAll('.diagram h4').length).toBe(ids);
      expect(unique.size).toBe(ids);
    });
  });

  describe('moving around and printing', () => {
    it('links back to the wizard for the same project', async () => {
      const summary = await open(reminders());

      const link = [...summary.querySelectorAll('a')].find((found) => found.textContent?.includes('Back to the wizard'));

      expect(link?.getAttribute('href')).toBe('/projects/p1');
    });

    it('prints the page when asked, and does not print anything itself', async () => {
      const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
      const summary = await open(reminders());

      const button = [...summary.querySelectorAll('button')].find((found) => found.textContent?.trim() === 'Print');
      expect(print).not.toHaveBeenCalled();
      button?.click();

      expect(print).toHaveBeenCalledTimes(1);
      print.mockRestore();
    });

    it('offers to export the design, in the block that is hidden when printing', async () => {
      const summary = await open(reminders());

      expect(summary.querySelector('.summary__actions sdc-export-menu')).not.toBeNull();
    });

    it('exports the design of the project on the page', async () => {
      const summary = await open(reminders());

      summary.querySelector<HTMLElement>('sdc-export-menu summary')?.click();
      await settle();
      [...summary.querySelectorAll<HTMLButtonElement>('sdc-export-menu button')]
        .find((found) => found.textContent?.includes('Download all as one file'))
        ?.click();

      expect(exporter.downloads.map((download) => download.fileName)).toEqual(['reminders-design-package.md']);
      expect(exporter.downloads[0].text).toContain('# Reminders: design package');
      expect(exporter.downloads[0].text).toContain('No-shows cost us chairs');
    });

    it('offers no export for a project that is not in this browser', async () => {
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/projects/missing/summary', SummaryComponent);
      await settle();

      expect(page().querySelector('sdc-export-menu')).toBeNull();
    });

    it('keeps the links and the Print button out of the content, in one block it can hide when printing', async () => {
      const summary = await open(reminders());
      const actions = summary.querySelector('.summary__actions');

      expect([...(actions?.querySelectorAll('a, .summary__tools > button') ?? [])].map((found) => found.textContent?.trim())).toEqual([
        '← Back to the wizard',
        'Print',
      ]);
      expect(summary.querySelector('article')?.querySelector('.summary__actions')).toBeNull();
    });
  });
});
