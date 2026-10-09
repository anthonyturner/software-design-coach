import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import { DIAGRAM_RENDERER } from '../../app/diagram-renderer';
import { PROJECT_REPOSITORY } from '../../app/project-repository';
import { FakeDiagramRenderer } from '../../app/testing/fake-diagram-renderer';
import { InMemoryProjectRepository } from '../../app/testing/in-memory-project-repository';
import { createProject, goTo as moveTo, workflowFor } from '../../domain';
import type { Step } from '../../domain';
import { WizardComponent } from './wizard.component';

/**
 * A test that walks every step answers each question one at a time. Measured: 1 to 3 s on its own, and
 * 5.2 s once with the whole suite running in parallel, which is over vitest's 5 s default.
 */
const WALK_TIMEOUT = 15_000;

describe('WizardComponent', () => {
  let repository: InMemoryProjectRepository;
  let diagrams: FakeDiagramRenderer;
  let harness: RouterTestingHarness;

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: PROJECT_REPOSITORY, useValue: repository },
        { provide: DIAGRAM_RENDERER, useValue: diagrams },
      ],
    });
  }

  async function open(id: string): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/projects/${id}`, WizardComponent);
    await settle();
    return routeElement();
  }

  async function reload(id: string): Promise<HTMLElement> {
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    TestBed.resetTestingModule();
    configure();
    return open(id);
  }

  function routeElement(): HTMLElement {
    if (!(harness.routeNativeElement instanceof HTMLElement)) {
      throw new Error('the routed component should be rendered');
    }
    return harness.routeNativeElement;
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  }

  const isShown = (page: HTMLElement, prompt: string): boolean =>
    [...page.querySelectorAll('label, .field__label, .step__question button')].some((found) => found.textContent?.includes(prompt));

  /** Walks the step to the question with this prompt, using Next as a user would. */
  async function reveal(prompt: string): Promise<void> {
    const page = routeElement();
    while (!isShown(page, prompt)) {
      const next = [...page.querySelectorAll('.step__nav button')].find((button) => button.textContent?.trim() === 'Next');
      if (!(next instanceof HTMLElement)) {
        throw new Error(`No question "${prompt}" on this step`);
      }
      await click(next);
    }
  }

  /** Steps back through the questions of the step, with Back as a user would, to the one with this prompt. */
  async function rewindTo(prompt: string): Promise<void> {
    const page = routeElement();
    const title = stepTitle(page);
    while (!isShown(page, prompt)) {
      await press(page, 'Back');
      if (stepTitle(page) !== title) {
        throw new Error(`No question "${prompt}" before this one on the step`);
      }
    }
  }

  /** Leaves the step by its Continue button, answering Next through any questions still to come. */
  async function advance(page: HTMLElement): Promise<void> {
    while ([...page.querySelectorAll('.step__nav button')].some((button) => button.textContent?.trim() === 'Next')) {
      await press(page, 'Next');
    }
    await press(page, 'Continue');
  }

  async function choose(page: HTMLElement, prompt: string, index: number): Promise<void> {
    await reveal(prompt);
    await click(radios(page)[index]);
  }

  async function type(scope: ParentNode, label: string, text: string): Promise<void> {
    await reveal(label);
    const field = fieldLabelled(scope, label);
    field.value = text;
    field.dispatchEvent(new Event('input'));
    await settle();
  }

  function fieldLabelled(scope: ParentNode, label: string): HTMLInputElement | HTMLTextAreaElement {
    const found = [...scope.querySelectorAll('label')].find((element) => element.textContent?.includes(label));
    const field =
      found && routeElement().querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${found.getAttribute('for')}`);
    if (!field) {
      throw new Error(`No field labelled "${label}"`);
    }
    return field;
  }

  async function press(page: HTMLElement, name: string): Promise<void> {
    const button = [...page.querySelectorAll('button')].find((element) => element.textContent?.trim() === name);
    if (!button) {
      throw new Error(`No button named "${name}"`);
    }
    await click(button);
  }

  async function click(target: HTMLElement): Promise<void> {
    target.click();
    await settle();
  }

  function buttonLabelled(page: HTMLElement, label: string): HTMLButtonElement {
    const button = page.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    if (!button) {
      throw new Error(`No button labelled "${label}"`);
    }
    return button;
  }

  const navButtons = (page: HTMLElement): (string | undefined)[] =>
    [...page.querySelectorAll('.step__nav button')].map((button) => button.textContent?.trim());

  const railButton = (page: HTMLElement, title: string): HTMLButtonElement => {
    const found = [...page.querySelectorAll<HTMLButtonElement>('.rail__step')].find((button) =>
      button.querySelector('.rail__name')?.textContent?.endsWith(title),
    );
    if (!found) {
      throw new Error(`No journey step "${title}"`);
    }
    return found;
  };

  const railState = (page: HTMLElement, title: string): string =>
    railButton(page, title).querySelector('.rail__state')?.textContent ?? '';

  const goTo = (page: HTMLElement, title: string): Promise<void> => click(railButton(page, title));

  const rows = (page: HTMLElement): HTMLElement[] => Array.from(page.querySelectorAll<HTMLElement>('.entity'));

  const radios = (page: HTMLElement): HTMLInputElement[] =>
    Array.from(page.querySelectorAll<HTMLInputElement>('input[type="radio"]'));

  const references = (row: HTMLElement): { label: string; checked: boolean }[] =>
    Array.from(row.querySelectorAll<HTMLLabelElement>('.entity__reference')).map((label) => ({
      label: label.textContent?.trim() ?? '',
      checked: label.querySelector<HTMLInputElement>('input')?.checked ?? false,
    }));

  async function pickReference(row: HTMLElement, label: string): Promise<void> {
    const option = [...row.querySelectorAll<HTMLLabelElement>('.entity__reference')].find(
      (found) => found.textContent?.trim() === label,
    );
    const box = option?.querySelector<HTMLInputElement>('input');
    if (!box) {
      throw new Error(`No option "${label}"`);
    }
    await click(box);
  }

  const buttonsIn = (scope: HTMLElement): (string | undefined)[] =>
    Array.from(scope.querySelectorAll('button')).map((button) => button.textContent?.trim());

  const chosenRadio = (page: HTMLElement): string | undefined =>
    radios(page).find((option) => option.checked)?.closest('label')?.textContent?.trim();

  const legends = (page: HTMLElement): (string | undefined)[] =>
    Array.from(page.querySelectorAll('.entity__legend')).map((legend) => legend.textContent?.trim());

  const stepTitle = (page: HTMLElement): string | undefined => page.querySelector('.step__title')?.textContent?.trim();

  beforeEach(async () => {
    repository = new InMemoryProjectRepository();
    diagrams = new FakeDiagramRenderer();
    await repository.save(
      createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now: '2026-10-08T09:00:00.000Z' }),
    );
    configure();
  });

  it('shows the first step with its framing, its first question and its challenges from the workflow data', async () => {
    const page = await open('p1');
    const problem = workflowFor('new-project').steps[0];

    expect(page.querySelector('.wizard__title')?.textContent).toBe('Reminders');
    expect(stepTitle(page)).toBe('Problem');
    expect(page.querySelector('.step__think')?.textContent).toBe(problem.think);
    expect(fieldLabelled(page, problem.questions[0].prompt)).toBeTruthy();
    expect([...page.querySelectorAll('.step__challenges li')].map((item) => item.textContent)).toEqual([...problem.challenges]);
  });

  it('shows Think, Decide, Challenge, Notes and Continue on a step', async () => {
    const page = await open('p1');

    expect([...page.querySelectorAll('.step__label')].map((label) => label.textContent)).toEqual([
      'Think',
      'Decide',
      'Challenge',
      'Notes',
      'Continue',
    ]);
  });

  it('keeps the reasoning and the example behind disclosures until asked', async () => {
    const page = await open('p1');
    const problem = workflowFor('new-project').steps[0];
    const [why, example] = Array.from(page.querySelectorAll('details'));

    expect([why.open, example.open]).toEqual([false, false]);
    expect(why.querySelector('summary')?.textContent).toBe('Why am I being asked this?');
    expect(why.textContent).toContain(problem.why);
    expect(example.querySelector('summary')?.textContent).toBe('Show me an example');
    expect(example.textContent).toContain('dental clinic');
  });

  it('carries an answer through Continue and Back, one step at a time', async () => {
    const page = await open('p1');

    await type(page, 'What problem are we solving', 'No-shows cost us chairs');
    await advance(page);

    expect(stepTitle(page)).toBe('Users');
    expect(page.textContent).toContain('Step 2 of 19');

    await press(page, 'Add actor');
    await type(page, 'Role', 'Receptionist');
    await press(page, 'Back');

    expect(stepTitle(page)).toBe('Problem');
    await rewindTo('What problem are we solving');
    expect(fieldLabelled(page, 'What problem are we solving').value).toBe('No-shows cost us chairs');
  });

  it('autosaves answers and the current step, so a reload resumes', async () => {
    const page = await open('p1');
    await type(page, 'What problem are we solving', 'No-shows cost us chairs');
    await advance(page);
    await press(page, 'Add actor');
    await type(page, 'Role', 'Receptionist');

    const reloaded = await reload('p1');

    expect(stepTitle(reloaded)).toBe('Users');
    expect(fieldLabelled(reloaded, 'Role').value).toBe('Receptionist');
    await press(reloaded, 'Back');
    await rewindTo('What problem are we solving');
    expect(fieldLabelled(reloaded, 'What problem are we solving').value).toBe('No-shows cost us chairs');
  });

  it('offers no Continue after the last step, and no Back on the first', async () => {
    const page = await open('p1');
    expect(navButtons(page)).toEqual(['Next']);

    for (let step = 1; step < workflowFor('new-project').steps.length; step++) {
      await advance(page);
    }

    expect(stepTitle(page)).toBe('Design Review');
    expect(navButtons(page)).toEqual(['Back', 'Next']);
    await reveal('Which earlier answer would you change');
    expect(navButtons(page)).toEqual(['Back']);
  }, WALK_TIMEOUT);

  it('opens a project at the step it was left on', async () => {
    const saved = moveTo(
      createProject({ id: 'p2', name: 'Half done', mode: 'new-project', now: '2026-10-08T09:00:00.000Z' }),
      'goals',
      '2026-10-08T09:10:00.000Z',
    );
    await repository.save(saved);

    const page = await open('p2');

    expect(stepTitle(page)).toBe('Goals');
  });

  it('says so when the project is not in this browser', async () => {
    const page = await open('nope');

    expect(page.textContent).toContain('This project is not in this browser');
  });

  describe('the journey rail', () => {
    it('lists all nineteen steps in a labelled navigation, with the step you are on marked', async () => {
      const page = await open('p1');

      expect(page.querySelector('nav')?.getAttribute('aria-label')).toBe('Design journey');
      expect(page.querySelectorAll('.rail__step')).toHaveLength(19);
      expect(railButton(page, 'Problem').getAttribute('aria-current')).toBe('step');
      expect(railState(page, 'Modules')).toBe(', not started');
      expect(railState(page, 'Design Review')).toBe(', not started');
    });

    it('goes to any step when clicked, in any order, and brings the answers with it', async () => {
      const page = await open('p1');
      await type(page, 'What problem are we solving', 'No-shows cost us chairs');

      await goTo(page, 'Modules');
      expect(stepTitle(page)).toBe('Modules');
      expect(page.textContent).toContain('Step 9 of 19');
      expect(railButton(page, 'Modules').getAttribute('aria-current')).toBe('step');
      expect(railButton(page, 'Problem').getAttribute('aria-current')).toBeNull();

      await goTo(page, 'Problem');
      expect(fieldLabelled(page, 'What problem are we solving').value).toBe('No-shows cost us chairs');
    });

    it('marks a step in progress after some answers and done after all the required ones', async () => {
      const page = await open('p1');
      await type(page, 'What problem are we solving', 'No-shows cost us chairs');
      await goTo(page, 'Users');
      expect(railState(page, 'Problem')).toBe(', in progress');

      await goTo(page, 'Problem');
      await type(page, 'Who feels it today', 'The desk');
      await type(page, 'How will you know', 'Fewer empty chairs');
      await goTo(page, 'Users');

      expect(railState(page, 'Problem')).toBe(', done');
      expect(page.querySelector('.step__status')?.textContent).toContain('1 required question is still open');
    });

    it('moves focus to the step heading when the step changes, so keyboard users land on it', async () => {
      const page = await open('p1');
      expect(document.activeElement?.id).not.toBe('step-title');

      await goTo(page, 'Goals');

      expect(document.activeElement?.id).toBe('step-title');
    });
  });

  describe('one question at a time', () => {
    const promptsShown = (page: HTMLElement): (string | undefined)[] =>
      [...page.querySelectorAll('.step__question .field__label')].map((label) => label.textContent?.trim());
    const position = (page: HTMLElement): string | undefined =>
      page.querySelector('.step__question-position')?.textContent?.replace(/\s+/g, ' ').trim();

    const [problem, users, goals] = workflowFor('new-project').steps;
    const place = (step: Step, index: number): string => `Question ${index + 1} of ${step.questions.length}`;

    it('walks the questions of a step, then carries on into the next step at its first question', async () => {
      const page = await open('p1');

      expect(promptsShown(page)).toEqual([problem.questions[0].prompt]);
      for (let index = 1; index < problem.questions.length; index++) {
        await press(page, 'Next');
      }
      expect(position(page)).toBe(place(problem, problem.questions.length - 1));
      expect(navButtons(page)).toEqual(['Back', 'Continue']);

      await press(page, 'Continue');

      expect(stepTitle(page)).toBe('Users');
      expect(promptsShown(page)).toEqual([users.questions[0].prompt]);
      expect(position(page)).toBe(place(users, 0));
    });

    it('goes back through the questions of a step, and from the first lands on the last question of the step before', async () => {
      const page = await open('p1');
      await advance(page);
      await press(page, 'Next');
      expect(position(page)).toContain(place(users, 1));

      await press(page, 'Back');
      expect(stepTitle(page)).toBe('Users');
      expect(position(page)).toBe(place(users, 0));

      await press(page, 'Back');
      expect(stepTitle(page)).toBe('Problem');
      expect(promptsShown(page)).toEqual([problem.questions[problem.questions.length - 1].prompt]);
      expect(position(page)).toBe(place(problem, problem.questions.length - 1));
    });

    it('opens a step from the journey rail at its first question, whichever way it was last left', async () => {
      const page = await open('p1');
      await advance(page);
      await press(page, 'Back');
      expect(position(page)).toBe(place(problem, problem.questions.length - 1));

      await goTo(page, 'Users');
      await press(page, 'Next');
      await goTo(page, 'Problem');

      expect(position(page)).toBe(place(problem, 0));
    });

    it('starts the step over when its own entry in the journey rail is chosen again', async () => {
      const page = await open('p1');
      await press(page, 'Next');
      await press(page, 'Next');

      await goTo(page, 'Problem');

      expect(position(page)).toBe(place(problem, 0));
    });

    it('opens a project saved on a later step at the first question of that step', async () => {
      await repository.save(
        moveTo(
          createProject({ id: 'p2', name: 'Half done', mode: 'new-project', now: '2026-10-08T09:00:00.000Z' }),
          'goals',
          '2026-10-08T09:10:00.000Z',
        ),
      );

      const page = await open('p2');

      expect(position(page)).toBe(place(goals, 0));
    });

    it('keeps an answer when the user moves to another question and back', async () => {
      const page = await open('p1');
      await type(page, 'What problem are we solving', 'No-shows cost us chairs');
      await press(page, 'Next');
      await type(page, 'Who feels it today', 'The desk');

      await press(page, 'Back');

      expect(fieldLabelled(page, 'What problem are we solving').value).toBe('No-shows cost us chairs');
    });

    it('counts the questions still open across the whole step, not just the one on screen', async () => {
      const page = await open('p1');
      await type(page, 'What problem are we solving', 'No-shows cost us chairs');

      await press(page, 'Next');

      expect(page.querySelector('.step__status')?.textContent).toContain('2 required questions are still open');
    });

    it('moves focus to the question when Next or Back changes it, and to the heading when the step changes', async () => {
      const page = await open('p1');

      await press(page, 'Next');
      expect(document.activeElement).toBe(page.querySelector('.step__question'));

      await press(page, 'Back');
      expect(document.activeElement).toBe(page.querySelector('.step__question'));

      await goTo(page, 'Goals');
      expect(document.activeElement?.id).toBe('step-title');
    });

    it('keeps the challenges behind a closed disclosure on every step', async () => {
      const page = await open('p1');
      const challenges = (): HTMLDetailsElement | null | undefined =>
        page.querySelector('.step__challenges')?.closest('details');
      const seen: (boolean | undefined)[] = [];

      for (let step = 0; step < workflowFor('new-project').steps.length; step++) {
        seen.push(challenges()?.open);
        if (step < workflowFor('new-project').steps.length - 1) {
          await advance(page);
        }
      }

      expect(seen).toEqual(workflowFor('new-project').steps.map(() => false));
    }, WALK_TIMEOUT);
  });

  describe('lists of actors, use cases and the rest', () => {
    async function twoActors(page: HTMLElement): Promise<void> {
      await goTo(page, 'Users');
      await press(page, 'Add actor');
      await type(rows(page)[0], 'Role', 'Receptionist');
      await press(page, 'Add actor');
      await type(rows(page)[1], 'Role', 'Patient');
    }

    it('adds a row, puts the cursor in its name, and removes it again', async () => {
      const page = await open('p1');
      await goTo(page, 'Users');
      expect(page.querySelector('.entities__empty')?.textContent).toBe('No actors yet.');

      await press(page, 'Add actor');
      expect(rows(page)).toHaveLength(1);
      expect(document.activeElement).toBe(fieldLabelled(rows(page)[0], 'Role'));

      await type(rows(page)[0], 'Role', 'Receptionist');
      await click(buttonLabelled(page, 'Remove Receptionist'));

      expect(rows(page)).toHaveLength(0);
    });

    it('puts the cursor on the neighbouring row after a removal, or on Add when none is left', async () => {
      const page = await open('p1');
      await twoActors(page);

      await click(buttonLabelled(page, 'Remove Receptionist'));
      expect(document.activeElement).toBe(fieldLabelled(rows(page)[0], 'Role'));
      expect(fieldLabelled(rows(page)[0], 'Role').value).toBe('Patient');

      await click(buttonLabelled(page, 'Remove Patient'));
      expect(document.activeElement).toBe(page.querySelector('.entities__add'));
    });

    it('puts the cursor on the row before when the last row is removed', async () => {
      const page = await open('p1');
      await twoActors(page);

      await click(buttonLabelled(page, 'Remove Patient'));

      expect(document.activeElement).toBe(fieldLabelled(rows(page)[0], 'Role'));
      expect(fieldLabelled(rows(page)[0], 'Role').value).toBe('Receptionist');
    });

    it('does not offer a concept as related to itself', async () => {
      const page = await open('p1');
      await goTo(page, 'Domain Concepts');
      await press(page, 'Add concept');
      await type(rows(page)[0], 'Concept', 'Patient');
      await press(page, 'Add concept');
      await type(rows(page)[1], 'Concept', 'Appointment');

      expect(references(rows(page)[0]).map((option) => option.label)).toEqual(['Appointment']);
      expect(references(rows(page)[1]).map((option) => option.label)).toEqual(['Patient']);
    });

    it('links the list-level hint to its group', async () => {
      const page = await open('p1');
      await goTo(page, 'Users');

      const group = page.querySelector('.entities');
      const hint = group?.querySelector('.field__hint');

      expect(hint?.id).toBeTruthy();
      expect(group?.getAttribute('aria-describedby')).toBe(hint?.id);
    });

    it('reorders rows with the move buttons and keeps the keyboard on the button it used', async () => {
      const page = await open('p1');
      await twoActors(page);

      await click(buttonLabelled(page, 'Move Patient up'));

      expect(rows(page).map((row) => fieldLabelled(row, 'Role').value)).toEqual(['Patient', 'Receptionist']);
      expect(buttonLabelled(page, 'Move Patient up').disabled).toBe(true);
      expect(document.activeElement).toBe(buttonLabelled(page, 'Move Patient down'));
    });

    it('lets a use case pick its actors, and a rename changes the name shown, not the pick', async () => {
      const page = await open('p1');
      await twoActors(page);
      await goTo(page, 'Use Cases');
      await press(page, 'Add use case');
      await type(rows(page)[0], 'Use case', 'Confirm an appointment');
      await pickReference(rows(page)[0], 'Patient');

      expect(references(rows(page)[0])).toEqual([
        { label: 'Receptionist', checked: false },
        { label: 'Patient', checked: true },
      ]);

      await goTo(page, 'Users');
      await type(rows(page)[1], 'Role', 'Dental patient');
      await goTo(page, 'Use Cases');

      expect(references(rows(page)[0])).toEqual([
        { label: 'Receptionist', checked: false },
        { label: 'Dental patient', checked: true },
      ]);
    });

    it('drops a removed actor from the use cases that named it', async () => {
      const page = await open('p1');
      await twoActors(page);
      await goTo(page, 'Use Cases');
      await press(page, 'Add use case');
      await pickReference(rows(page)[0], 'Receptionist');
      expect(references(rows(page)[0])[0].checked).toBe(true);

      await goTo(page, 'Users');
      await click(buttonLabelled(page, 'Remove Receptionist'));
      await goTo(page, 'Use Cases');

      expect(references(rows(page)[0])).toEqual([{ label: 'Patient', checked: false }]);
    });

    it('asks for a choice as a labelled group of options', async () => {
      const page = await open('p1');
      await goTo(page, 'System Boundary');

      await choose(page, 'What kind of thing', 1);

      expect(page.querySelector('legend.field__label')?.textContent).toBe('What kind of thing are you building?');
      expect(radios(page).map((option) => option.checked)).toEqual([false, true, false, false, false]);
    });

    it('keeps the lists and the choice across a reload', async () => {
      const page = await open('p1');
      await twoActors(page);
      await goTo(page, 'System Boundary');
      await choose(page, 'What kind of thing', 1);

      const reloaded = await reload('p1');
      expect(radios(reloaded)[1].checked).toBe(true);
      await goTo(reloaded, 'Users');

      expect(rows(reloaded).map((row) => fieldLabelled(row, 'Role').value)).toEqual(['Receptionist', 'Patient']);
    });
  });

  describe('module details', () => {
    const labelsIn = (scope: HTMLElement): (string | undefined)[] =>
      Array.from(scope.querySelectorAll('label')).map((label) => label.textContent?.trim());

    async function twoModules(page: HTMLElement): Promise<void> {
      await goTo(page, 'Modules');
      await press(page, 'Add module');
      await type(rows(page)[0], 'Module', 'Reminders');
      await press(page, 'Add module');
      await type(rows(page)[1], 'Module', 'Messaging');
    }

    it('asks only for a name and a purpose when the modules are listed', async () => {
      const page = await open('p1');
      await twoModules(page);

      expect(labelsIn(rows(page)[0])).toEqual(['Module', 'What does it own, in one sentence?']);
    });

    it('shows each module as its own group on a step about one thing it has, with nothing else to edit', async () => {
      const page = await open('p1');
      await twoModules(page);

      await goTo(page, 'Responsibilities');

      expect(legends(page)).toEqual(['Reminders', 'Messaging']);
      expect(labelsIn(rows(page)[0])).toEqual(['What is it responsible for?']);
      expect(page.querySelector('.entities__add')).toBeNull();
      expect(buttonsIn(rows(page)[0])).toEqual([]);
    });

    it('says where to find the modules when none are listed yet', async () => {
      const page = await open('p1');

      await goTo(page, 'Responsibilities');

      expect(page.querySelector('.entities__empty')?.textContent).toContain('No modules listed yet');
    });

    it('keeps responsibilities one to a line, and brings them back after a reload', async () => {
      const page = await open('p1');
      await twoModules(page);
      await goTo(page, 'Responsibilities');

      await type(rows(page)[0], 'What is it responsible for?', 'Decide when one is due\n\nWord it\n');
      const reloaded = await reload('p1');

      expect(fieldLabelled(rows(reloaded)[0], 'What is it responsible for?').value).toBe('Decide when one is due\nWord it');
      expect(fieldLabelled(rows(reloaded)[1], 'What is it responsible for?').value).toBe('');
    });

    it('keeps what a module hides, and the sketch of its interface, with that module', async () => {
      const page = await open('p1');
      await twoModules(page);
      await goTo(page, 'Information Hiding');
      await type(rows(page)[1], 'What does it know', 'Which provider, and its message format');
      await goTo(page, 'Interfaces');
      await type(rows(page)[1], 'What does a caller need', 'send(patient, message)');

      await goTo(page, 'Information Hiding');
      expect(fieldLabelled(rows(page)[0], 'What does it know').value).toBe('');
      expect(fieldLabelled(rows(page)[1], 'What does it know').value).toBe('Which provider, and its message format');
      await goTo(page, 'Interfaces');
      expect(fieldLabelled(rows(page)[1], 'What does a caller need').value).toBe('send(patient, message)');
    });

    it('offers the other modules as dependencies, never the module itself', async () => {
      const page = await open('p1');
      await twoModules(page);

      await goTo(page, 'Dependencies');

      expect(references(rows(page)[0])).toEqual([{ label: 'Messaging', checked: false }]);
      expect(references(rows(page)[1])).toEqual([{ label: 'Reminders', checked: false }]);
    });

    it('keeps a dependency through a rename, and drops it when the module is removed', async () => {
      const page = await open('p1');
      await twoModules(page);
      await goTo(page, 'Dependencies');
      await pickReference(rows(page)[0], 'Messaging');

      await goTo(page, 'Modules');
      await type(rows(page)[1], 'Module', 'Texting');
      await goTo(page, 'Dependencies');
      expect(references(rows(page)[0])).toEqual([{ label: 'Texting', checked: true }]);
      expect(railState(page, 'Dependencies')).toBe('');

      await goTo(page, 'Modules');
      await click(buttonLabelled(page, 'Remove Texting'));
      await goTo(page, 'Dependencies');
      expect(legends(page)).toEqual(['Reminders']);
      expect(references(rows(page)[0])).toEqual([]);
    });
  });

  describe('design it twice, then decide', () => {
    async function option(page: HTMLElement, index: number, name: string): Promise<void> {
      await press(page, 'Add architecture option');
      await type(rows(page)[index], 'Option', name);
    }

    it('asks for an approach, strengths and costs for each option', async () => {
      const page = await open('p1');
      await goTo(page, 'Architecture Options');

      await option(page, 0, 'Four modules');

      expect([...rows(page)[0].querySelectorAll('label')].map((label) => label.textContent?.trim())).toEqual([
        'Option',
        'How does it work, in a few sentences?',
        'What does it make easy?',
        'What does it make hard, or cost?',
      ]);
    });

    it('is not done with one option, and is done with two and a comparison', async () => {
      const page = await open('p1');
      await goTo(page, 'Architecture Options');
      await option(page, 0, 'Four modules');
      await type(page, 'How do they compare', 'The first hides more');

      await goTo(page, 'Goals');
      expect(railState(page, 'Architecture Options')).toBe(', in progress');

      await goTo(page, 'Architecture Options');
      await option(page, 1, 'One module');
      await goTo(page, 'Goals');
      expect(railState(page, 'Architecture Options')).toBe(', done');
    });

    it('offers the named options to choose from, and says so when there are none', async () => {
      const page = await open('p1');
      await goTo(page, 'Decision');
      expect(radios(page)).toHaveLength(0);
      expect(page.querySelector('.choice .field__hint')?.textContent).toContain('No architecture options named yet');

      await goTo(page, 'Architecture Options');
      await option(page, 0, 'Four modules');
      await option(page, 1, 'One module');
      await press(page, 'Add architecture option');
      await goTo(page, 'Decision');

      expect(radios(page).map((radio) => radio.closest('label')?.textContent?.trim())).toEqual([
        'Four modules',
        'One module',
      ]);
    });

    it('remembers the choice through a rename and a reload, and forgets it when that option is removed', async () => {
      const page = await open('p1');
      await goTo(page, 'Architecture Options');
      await option(page, 0, 'Four modules');
      await option(page, 1, 'One module');
      await goTo(page, 'Decision');
      await choose(page, 'Which option are you choosing', 1);

      await goTo(page, 'Architecture Options');
      await type(rows(page)[1], 'Option', 'Single module');
      const reloaded = await reload('p1');
      await goTo(reloaded, 'Decision');
      expect(chosenRadio(reloaded)).toBe('Single module');

      await goTo(reloaded, 'Architecture Options');
      await click(buttonLabelled(reloaded, 'Remove Single module'));
      await goTo(reloaded, 'Decision');
      expect(chosenRadio(reloaded)).toBeUndefined();
      expect(radios(reloaded).map((radio) => radio.closest('label')?.textContent?.trim())).toEqual(['Four modules']);
    });

    it('offers the use cases for the first vertical slice', async () => {
      const page = await open('p1');
      await goTo(page, 'Use Cases');
      await press(page, 'Add use case');
      await type(rows(page)[0], 'Use case', 'Confirm an appointment');

      await goTo(page, 'First Vertical Slice');
      await choose(page, 'Which use case will you build', 0);

      expect(chosenRadio(page)).toBe('Confirm an appointment');
    });
  });

  describe('the whole workflow', () => {
    async function addRow(page: HTMLElement, noun: string, index: number, label: string, name: string): Promise<void> {
      await reveal(`Add ${noun}`);
      await press(page, `Add ${noun}`);
      await type(rows(page)[index], label, name);
    }

    async function fill(page: HTMLElement, answers: readonly (readonly [string, string])[]): Promise<void> {
      for (const [label, text] of answers) {
        await type(page, label, text);
      }
    }

    async function walk(page: HTMLElement): Promise<void> {
      await fill(page, [
        ['What problem are we solving', 'No-shows cost us chairs'],
        ['Who feels it today', 'The desk'],
        ['How will you know', 'Fewer empty chairs'],
      ]);
      await advance(page);
      await addRow(page, 'actor', 0, 'Role', 'Receptionist');
      await advance(page);
      await fill(page, [
        ['What must be true when this succeeds', 'Patients are reminded'],
        ['For each goal, what would you observe', 'No reminder calls'],
      ]);
      await advance(page);
      await fill(page, [['What will this system deliberately not do', 'Online booking']]);
      await advance(page);
      await fill(page, [['What must the system do', 'Send a text the day before']]);
      await advance(page);
      await addRow(page, 'use case', 0, 'Use case', 'Confirm an appointment');
      await advance(page);
      await addRow(page, 'concept', 0, 'Concept', 'Appointment');
      await advance(page);
      await choose(page, 'What kind of thing', 0);
      await fill(page, [['what is yours to build and own', 'Reminder rules']]);
      await advance(page);
      await addRow(page, 'module', 0, 'Module', 'Reminders');
      await addRow(page, 'module', 1, 'Module', 'Messaging');
      await advance(page);
      await type(rows(page)[0], 'What is it responsible for?', 'Decide when one is due');
      await advance(page);
      await type(rows(page)[1], 'What does it know', 'The provider and its formats');
      await advance(page);
      await type(rows(page)[1], 'What does a caller need', 'send(patient, message)');
      await advance(page);
      await pickReference(rows(page)[0], 'Messaging');
      await advance(page);
      await addRow(page, 'architecture option', 0, 'Option', 'Four modules');
      await addRow(page, 'architecture option', 1, 'Option', 'One module');
      await fill(page, [['How do they compare', 'The first hides more']]);
      await advance(page);
      await choose(page, 'Which option are you choosing', 0);
      await fill(page, [['Why this one', 'Different reasons to change']]);
      await advance(page);
      await choose(page, 'Which use case will you build', 0);
      await fill(page, [
        ['Trace it through the modules', 'Reminders asks Messaging to send'],
        ['What will you know after building it', 'Whether the provider can be hidden'],
      ]);
      await advance(page);
      await fill(page, [
        ['What behaviours must the first slice show', 'A reminder is sent a day before'],
        ['first test you will write', 'dueReminders returns one reminder'],
      ]);
      await advance(page);
      await fill(page, [['What are the steps, in order', 'Reminders first, with a fake schedule']]);
      await advance(page);
      await fill(page, [
        ['least sure about', 'Reminders may do too much'],
        ['biggest risks', 'The provider reply format'],
      ]);
      await choose(page, 'Is this design ready', 1);
    }

    it('can be completed from the first step to the last, every step ending up done', async () => {
      const page = await open('p1');

      await walk(page);

      expect(stepTitle(page)).toBe('Design Review');
      expect(page.textContent).toContain('Step 19 of 19');
      await reveal('Which earlier answer would you change');
      expect(navButtons(page)).toEqual(['Back']);
      const states = [...page.querySelectorAll('.rail__step')].map(
        (step) => step.querySelector('.rail__state')?.textContent ?? '',
      );
      expect(states).toHaveLength(19);
      expect(states.slice(0, 18).every((state) => state === ', done')).toBe(true);
      expect(page.querySelector('.step__status')?.textContent).toBe('Every required question on this step is answered.');
    }, WALK_TIMEOUT);

    it('is all still there after a reload', async () => {
      const page = await open('p1');
      await walk(page);

      const reloaded = await reload('p1');

      expect(stepTitle(reloaded)).toBe('Design Review');
      await reveal('Is this design ready');
      expect(chosenRadio(reloaded)).toContain('with the risks above');
      await goTo(reloaded, 'Dependencies');
      expect(references(rows(reloaded)[0])).toEqual([{ label: 'Messaging', checked: true }]);
      await goTo(reloaded, 'Decision');
      expect(chosenRadio(reloaded)).toBe('Four modules');
    }, WALK_TIMEOUT);
  });

  describe('saying that nothing needs listing, and the small things around it', () => {
    const noneBox = (page: HTMLElement): HTMLInputElement | null =>
      page.querySelector<HTMLInputElement>('.entities__none input[type="checkbox"]');

    async function oneModule(page: HTMLElement): Promise<void> {
      await goTo(page, 'Modules');
      await press(page, 'Add module');
      await type(rows(page)[0], 'Module', 'Reminders');
    }

    async function twoModules(page: HTMLElement): Promise<void> {
      await oneModule(page);
      await press(page, 'Add module');
      await type(rows(page)[1], 'Module', 'Messaging');
    }

    it('lets a one-module design finish Dependencies by saying that nothing depends on anything', async () => {
      const page = await open('p1');
      await oneModule(page);
      await goTo(page, 'Dependencies');
      expect(noneBox(page)?.closest('label')?.textContent?.trim()).toBe('No module depends on another');
      expect(page.querySelector('.step__status')?.textContent).toContain('1 required question is still open');

      await click(noneBox(page) as HTMLInputElement);

      expect(noneBox(page)?.checked).toBe(true);
      expect(page.querySelector('.step__status')?.textContent).toBe('Every required question on this step is answered.');
      await goTo(page, 'Goals');
      expect(railState(page, 'Dependencies')).toBe(', done');
    });

    it('can be taken back, and survives a reload', async () => {
      const page = await open('p1');
      await oneModule(page);
      await goTo(page, 'Dependencies');
      await click(noneBox(page) as HTMLInputElement);

      const reloaded = await reload('p1');
      expect(noneBox(reloaded)?.checked).toBe(true);

      await click(noneBox(reloaded) as HTMLInputElement);
      expect(reloaded.querySelector('.step__status')?.textContent).toContain('1 required question is still open');
    });

    it('is not offered when there are no modules to say it about', async () => {
      const page = await open('p1');

      await goTo(page, 'Dependencies');

      expect(noneBox(page)).toBeNull();
    });

    it('unticks itself when a dependency is added, and cannot be ticked while one exists', async () => {
      const page = await open('p1');
      await twoModules(page);
      await goTo(page, 'Dependencies');
      await click(noneBox(page) as HTMLInputElement);

      await pickReference(rows(page)[0], 'Messaging');

      expect(noneBox(page)?.checked).toBe(false);
      expect(noneBox(page)?.disabled).toBe(true);

      await pickReference(rows(page)[0], 'Messaging');
      expect(noneBox(page)?.checked).toBe(false);
      expect(noneBox(page)?.disabled).toBe(false);
    });

    it('shows the hint for a field once above the rows, not again inside each one', async () => {
      const page = await open('p1');
      await twoModules(page);

      await goTo(page, 'Responsibilities');

      expect(page.querySelectorAll('.entities > .field__hint')).toHaveLength(1);
      expect(rows(page).flatMap((row) => [...row.querySelectorAll('.field__hint')])).toEqual([]);
    });

    it('ties the empty text of a reference list to the list, so a screen reader reads it with the group', async () => {
      const page = await open('p1');
      await goTo(page, 'Use Cases');
      await press(page, 'Add use case');

      const group = rows(page)[0].querySelector('fieldset.entity__references');
      const described = group?.getAttribute('aria-describedby')?.split(' ').map((id) => page.querySelector(`#${id}`)?.textContent);

      expect(described).toEqual(['No actors listed yet.']);
    });

    it('ties the empty text of a choice to the choice', async () => {
      const page = await open('p1');
      await goTo(page, 'Decision');

      const group = page.querySelector('fieldset.choice');
      const described = group?.getAttribute('aria-describedby')?.split(' ').map((id) => page.querySelector(`#${id}`)?.textContent);

      expect(described).toEqual(['No architecture options named yet. Name them in an earlier step, then come back.']);
    });
  });

  describe('the diagram beside a step', () => {
    const panel = (page: HTMLElement): HTMLElement | null => page.querySelector('sdc-diagram-panel');

    it('shows none on a step that declares no diagram, and gives the step the whole width', async () => {
      const page = await open('p1');

      expect(stepTitle(page)).toBe('Problem');
      expect(panel(page)).toBeNull();
      expect(page.querySelector('.wizard__layout--diagram')).toBeNull();
    });

    it('shows the diagram the step declares, with a note on what to name while the model has nothing to draw', async () => {
      const page = await open('p1');

      await goTo(page, 'Users');

      expect(panel(page)?.querySelector('.diagram__caption')?.textContent).toBe('System context');
      expect(panel(page)?.textContent).toContain('Name an actor or an outside system');
      expect(page.querySelector('.wizard__layout--diagram')).not.toBeNull();
      expect(diagrams.drawings).toHaveLength(0);
    });

    it('draws what the user has answered, from the model, and offers its source as text', async () => {
      const page = await open('p1');
      await goTo(page, 'Users');
      await press(page, 'Add actor');

      await type(page, 'Role', 'Receptionist');
      await settle();

      expect(diagrams.drawings).toHaveLength(1);
      expect(diagrams.drawings[0].source).toMatch(/^flowchart LR\n/);
      expect(diagrams.drawings[0].source).toContain('["Receptionist"]');
      expect(panel(page)?.querySelector('details pre')?.textContent).toBe(diagrams.drawings[0].source);
    });

    it('changes the diagram with the step, so a step is always shown the diagram it declares', async () => {
      const page = await open('p1');
      await goTo(page, 'Users');
      await press(page, 'Add actor');
      await type(page, 'Role', 'Receptionist');

      await goTo(page, 'Modules');

      expect(panel(page)?.querySelector('.diagram__caption')?.textContent).toBe('Modules');
      expect(panel(page)?.textContent).toContain('Name a module');
    });
  });

  describe('the details of a module, opened from its diagram', () => {
    const drawer = (page: HTMLElement): HTMLElement | null => page.querySelector('[role="dialog"]');
    const heading = (page: HTMLElement): string | undefined => drawer(page)?.querySelector('h3')?.textContent?.trim();

    async function modules(page: HTMLElement): Promise<void> {
      await goTo(page, 'Modules');
      await press(page, 'Add module');
      await type(rows(page)[0], 'Module', 'Reminders');
      await press(page, 'Add module');
      await type(rows(page)[1], 'Module', 'Messaging');
      await type(rows(page)[1], 'What does it own', 'Sends texts');
    }

    /** Activates the node of the named module the way the renderer does, with a focusable node standing in for the drawn one. */
    async function activate(name: string): Promise<SVGElement> {
      await settle();
      const drawing = diagrams.drawings.at(-1);
      const nodeId = [...(drawing?.interaction?.nodes ?? [])].find(([, label]) => label === name)?.[0];
      if (!drawing || nodeId === undefined) {
        throw new Error(`The diagram has no node for "${name}"`);
      }
      drawing.finish();
      await settle();
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      node.setAttribute('tabindex', '0');
      drawing.host.append(node);
      drawing.interaction?.onActivate(nodeId, node);
      await settle();
      return node;
    }

    /** Presses Escape where focus is, as the browser does, and says whether anything cancelled it. */
    async function escape(target: Element = document.activeElement ?? document.body, cancelled = false): Promise<void> {
      const press = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      if (cancelled) {
        press.preventDefault();
      }
      target.dispatchEvent(press);
      await settle();
    }

    it('names the modules of the module diagram as the nodes to activate, and no node of any other diagram', async () => {
      const page = await open('p1');
      await goTo(page, 'Users');
      await press(page, 'Add actor');
      await type(page, 'Role', 'Receptionist');
      expect(diagrams.drawings.at(-1)?.interaction).toBeUndefined();

      await modules(page);

      expect([...(diagrams.drawings.at(-1)?.interaction?.nodes.values() ?? [])]).toEqual(['Reminders', 'Messaging']);
    });

    it('opens nothing until a node is activated', async () => {
      const page = await open('p1');

      await modules(page);

      expect(drawer(page)).toBeNull();
    });

    it('opens the module that was activated, with what the user wrote about it, and moves focus in', async () => {
      const page = await open('p1');
      await modules(page);

      await activate('Messaging');

      expect(heading(page)).toBe('Messaging');
      expect(drawer(page)?.textContent).toContain('Sends texts');
      expect(drawer(page)?.getAttribute('aria-labelledby')).toBe(drawer(page)?.querySelector('h3')?.id);
      expect(document.activeElement).toBe(drawer(page));
    });

    it('shows another module when another node is activated, without a second drawer', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');

      await activate('Reminders');

      expect(page.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      expect(heading(page)).toBe('Reminders');
    });

    it('closes on Escape and returns focus to the node that opened it', async () => {
      const page = await open('p1');
      await modules(page);
      const node = await activate('Messaging');

      await escape();

      expect(drawer(page)).toBeNull();
      expect(document.activeElement).toBe(node);
    });

    it('closes from its Close button and returns focus to the node that opened it', async () => {
      const page = await open('p1');
      await modules(page);
      const node = await activate('Messaging');

      await press(drawer(page) ?? page, 'Close');

      expect(drawer(page)).toBeNull();
      expect(document.activeElement).toBe(node);
    });

    it('closes on Escape pressed on a node of the diagram, which is where focus can be after Shift+Tab', async () => {
      const page = await open('p1');
      await modules(page);
      const node = await activate('Messaging');
      node.focus();

      await escape();

      expect(drawer(page)).toBeNull();
      expect(document.activeElement).toBe(node);
    });

    it('leaves the drawer open, and focus where it was, when Escape is pressed in a step field', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');
      const field = fieldLabelled(rows(page)[1], 'What does it own');
      field.focus();

      await escape();

      expect(heading(page)).toBe('Messaging');
      expect(document.activeElement).toBe(field);
    });

    it('leaves the drawer open when something else already used the Escape', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');

      await escape(drawer(page) ?? page, true);

      expect(heading(page)).toBe('Messaging');
    });

    it('returns focus to the diagram panel when a redraw has replaced the node', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');
      await type(rows(page)[1], 'What does it own', 'Sends texts and calls');
      await settle();
      diagrams.drawings.at(-1)?.finish();
      await settle();

      await escape(drawer(page) ?? page);

      expect(document.activeElement).toBe(page.querySelector('sdc-diagram-panel section'));
    });

    it('can be opened again after it was closed', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');
      await escape();

      await activate('Messaging');

      expect(heading(page)).toBe('Messaging');
    });

    it('follows an edit to the module while it is open, and does not take focus from the field being typed in', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');

      const field = fieldLabelled(rows(page)[1], 'What does it own');
      field.focus();
      await type(rows(page)[1], 'What does it own', 'Sends texts and calls');

      expect(drawer(page)?.textContent).toContain('Sends texts and calls');
      expect(document.activeElement).toBe(field);
    });

    it('closes for good when the module loses its name, instead of coming back when it is named again', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');

      await type(rows(page)[1], 'Module', '');
      expect(drawer(page)).toBeNull();
      await type(rows(page)[1], 'Module', 'Messaging');

      expect(drawer(page)).toBeNull();
    });

    it('closes when the step changes to one that does not draw the module', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');

      await goTo(page, 'Users');
      await goTo(page, 'Modules');

      expect(drawer(page)).toBeNull();
    });

    it('opens from the dependency diagram too, naming what the module needs and what needs it', async () => {
      const page = await open('p1');
      await modules(page);
      await goTo(page, 'Dependencies');
      await pickReference(rows(page)[0], 'Messaging');

      await activate('Messaging');

      const text = drawer(page)?.textContent ?? '';
      expect(heading(page)).toBe('Messaging');
      expect(text).toContain('Needed by');
      expect(text).toContain('Reminders');
    });
  });

  describe('notes on a step', () => {
    const notesArea = (page: HTMLElement): HTMLDetailsElement | null =>
      page.querySelector<HTMLDetailsElement>('sdc-note-field details');

    it('offers a collapsed notes area on every step, from the first to the last', async () => {
      const page = await open('p1');
      const seen: (boolean | undefined)[] = [];

      for (let step = 0; step < workflowFor('new-project').steps.length; step++) {
        seen.push(notesArea(page)?.open);
        if (step < workflowFor('new-project').steps.length - 1) {
          await advance(page);
        }
      }

      expect(seen).toEqual(workflowFor('new-project').steps.map(() => false));
    }, WALK_TIMEOUT);

    it('keeps what is typed against the step it was typed on, through a reload', async () => {
      const page = await open('p1');
      await type(page, 'Your notes on this step', 'Ask the clinic owner about no-shows');
      await advance(page);
      await type(page, 'Your notes on this step', 'Who else is affected?');
      await press(page, 'Back');

      const reloaded = await reload('p1');

      expect(stepTitle(reloaded)).toBe('Problem');
      expect(notesArea(reloaded)?.open).toBe(true);
      expect(fieldLabelled(reloaded, 'Your notes on this step').value).toBe('Ask the clinic owner about no-shows');
      await advance(reloaded);
      expect(fieldLabelled(reloaded, 'Your notes on this step').value).toBe('Who else is affected?');
    });

    it('opens a step that has a note and leaves a step without one closed', async () => {
      const page = await open('p1');
      await type(page, 'Your notes on this step', 'A note');

      await advance(page);
      expect(notesArea(page)?.open).toBe(false);

      await press(page, 'Back');
      expect(notesArea(page)?.open).toBe(true);
    });

    it('is not an answer: it does not count towards a step being done', async () => {
      const page = await open('p1');
      await type(page, 'Your notes on this step', 'A note');
      await advance(page);

      expect(railState(page, 'Problem')).toBe(', not started');
    });

    it('sits in a section of its own, headed Notes, after Challenge and before Continue', async () => {
      const page = await open('p1');
      const sections = [...page.querySelectorAll('.step__section')];
      const headings = sections.map((section) => section.querySelector('h4')?.textContent?.trim());
      const holder = page.querySelector('sdc-note-field')?.closest('.step__section');

      expect(headings).toEqual(['Think', 'Decide', 'Challenge', 'Notes', 'Continue']);
      expect(holder?.querySelector('h4')?.textContent?.trim()).toBe('Notes');
    });

    it('links to the summary of the project', async () => {
      const page = await open('p1');

      const link = [...page.querySelectorAll('a')].find((found) => found.textContent?.trim() === 'View summary');

      expect(link?.getAttribute('href')).toBe('/projects/p1/summary');
    });
  });

  describe('notes in the details of a module', () => {
    const drawer = (page: HTMLElement): HTMLElement | null => page.querySelector('[role="dialog"]');
    const mentions = (page: HTMLElement): { step: string | null; text: string | null }[] =>
      [...(drawer(page)?.querySelectorAll('.drawer__note') ?? [])].map((note) => ({
        step: note.querySelector('.drawer__note-step')?.textContent ?? null,
        text: note.querySelector('.drawer__note-text')?.textContent ?? null,
      }));

    async function activate(name: string): Promise<void> {
      await settle();
      const drawing = diagrams.drawings.at(-1);
      const nodeId = [...(drawing?.interaction?.nodes ?? [])].find(([, label]) => label === name)?.[0];
      if (!drawing || nodeId === undefined) {
        throw new Error(`The diagram has no node for "${name}"`);
      }
      drawing.finish();
      await settle();
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      node.setAttribute('tabindex', '0');
      drawing.host.append(node);
      drawing.interaction?.onActivate(nodeId, node);
      await settle();
    }

    async function modules(page: HTMLElement): Promise<void> {
      await goTo(page, 'Modules');
      await press(page, 'Add module');
      await type(rows(page)[0], 'Module', 'Reminders');
      await press(page, 'Add module');
      await type(rows(page)[1], 'Module', 'Messaging');
    }

    it('says no note mentions the module until one does', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');

      expect(mentions(page)).toEqual([]);
      expect(drawer(page)?.textContent).toContain('No note mentions this module.');
    });

    it('lists, under their step, the notes that name the module, whichever step they were written on', async () => {
      const page = await open('p1');
      await goTo(page, 'Goals');
      await type(page, 'Your notes on this step', 'Messaging must be quick; reminders can wait');
      await modules(page);
      await type(page, 'Your notes on this step', 'Is MESSAGING a module, or a detail of Reminders?');
      await activate('Messaging');

      expect(mentions(page)).toEqual([
        { step: 'Goals', text: 'Messaging must be quick; reminders can wait' },
        { step: 'Modules', text: 'Is MESSAGING a module, or a detail of Reminders?' },
      ]);
    });

    it('changes as a note is typed while the drawer is open, and as the module is renamed', async () => {
      const page = await open('p1');
      await modules(page);
      await activate('Messaging');

      await type(page, 'Your notes on this step', 'Messaging sends the texts');
      expect(mentions(page).map((note) => note.step)).toEqual(['Modules']);

      await type(rows(page)[1], 'Module', 'Texting');
      expect(drawer(page)?.querySelector('h3')?.textContent).toBe('Texting');
      expect(mentions(page)).toEqual([]);
    });

    it('does not count a longer word that contains the module name', async () => {
      const page = await open('p1');
      await modules(page);
      await type(page, 'Your notes on this step', 'Remindersgalore and unmessaging');
      await activate('Reminders');

      expect(mentions(page)).toEqual([]);
    });
  });

  describe('a Feature / Change project', () => {
    const panel = (page: HTMLElement): HTMLElement | null => page.querySelector('sdc-diagram-panel');
    const caption = (page: HTMLElement): string | null | undefined => panel(page)?.querySelector('.diagram__caption')?.textContent;

    async function addRow(page: HTMLElement, noun: string, index: number, label: string, name: string): Promise<void> {
      await reveal(`Add ${noun}`);
      await press(page, `Add ${noun}`);
      await type(rows(page)[index], label, name);
    }

    async function fill(page: HTMLElement, answers: readonly (readonly [string, string])[]): Promise<void> {
      for (const [label, text] of answers) {
        await type(page, label, text);
      }
    }

    async function walk(page: HTMLElement): Promise<void> {
      await fill(page, [['What is changing', 'A patient can cancel by replying CANCEL']]);
      await choose(page, 'What kind of change', 0);
      await advance(page);
      await fill(page, [
        ['Who benefits', 'The desk stops phoning'],
        ['What happens if you do not make this change', 'The calls carry on'],
      ]);
      await advance(page);
      await fill(page, [['What does the system do today', 'Texts a reminder and reads yes']]);
      await addRow(page, 'actor', 0, 'Role', 'Patient');
      await fill(page, [['What must keep working', 'A yes still confirms']]);
      await advance(page);
      await addRow(page, 'use case', 0, 'Use case', 'Patient cancels by text');
      await pickReference(rows(page)[0], 'Patient');
      await advance(page);
      await addRow(page, 'concept', 0, 'Concept', 'Appointment');
      await fill(page, [['Which of these change meaning', 'Appointment can now be cancelled']]);
      await advance(page);
      await addRow(page, 'module', 0, 'Module', 'Reminders');
      await addRow(page, 'module', 1, 'Module', 'Messaging');
      await type(rows(page)[1], 'What does it know', 'The provider and its formats');
      await fill(page, [['known by more than one module', 'What a yes means']]);
      await advance(page);
      await pickReference(rows(page)[0], 'Messaging');
      await fill(page, [['Which modules have to change', 'Reminders inside, Scheduling at its interface']]);
      await advance(page);
      await fill(page, [['would you have to edit', 'Messaging and Reminders']]);
      await choose(page, 'where would that knowledge live', 1);
      await advance(page);
      await addRow(page, 'architecture option', 0, 'Option', 'Interpret in Reminders');
      await addRow(page, 'architecture option', 1, 'Option', 'Extend Messaging');
      await fill(page, [['How do they compare', 'The first hides more']]);
      await advance(page);
      await choose(page, 'Which option are you recommending', 0);
      await fill(page, [['Why this one', 'Reminders owns the rules']]);
      await advance(page);
      await fill(page, [
        ['How will you pin down', 'Characterise the yes reply first'],
        ['first test of the new behaviour', 'handleReply cancels the appointment'],
      ]);
      await advance(page);
      await choose(page, 'Which desired behaviour will you deliver first', 0);
      await fill(page, [
        ['Trace it through the modules', 'Messaging hands the reply to Reminders'],
        ['How will you keep it safe', 'Behind a setting that is off'],
      ]);
      await advance(page);
      await fill(page, [
        ['reshape first', 'Move the yes handling into Reminders'],
        ['leave behind', 'The keyword list in Messaging'],
      ]);
      await advance(page);
      await fill(page, [['least sure about', 'Reminders may grow']]);
      await choose(page, 'Is this change ready', 1);
    }

    beforeEach(async () => {
      await repository.save(
        createProject({ id: 'f1', name: 'Cancel by text', mode: 'feature-change', now: '2026-10-08T09:00:00.000Z' }),
      );
    });

    it('opens on its own first step, in its own workflow', async () => {
      const page = await open('f1');

      expect(page.querySelector('.wizard__mode')?.textContent).toBe('Feature / Change');
      expect(stepTitle(page)).toBe('Change');
      expect(page.textContent).toContain('Step 1 of 14');
      expect(page.querySelectorAll('.rail__step')).toHaveLength(14);
      expect(page.querySelector('.step__think')?.textContent).toBe(workflowFor('feature-change').steps[0].think);
    });

    it('walks a few steps, and resumes where it was left after a reload', async () => {
      const page = await open('f1');
      await type(page, 'What is changing', 'A patient can cancel by replying CANCEL');
      await choose(page, 'What kind of change', 0);
      await advance(page);
      await type(page, 'Who benefits', 'The desk stops phoning');
      await goTo(page, 'Current Ownership');
      await addRow(page, 'module', 0, 'Module', 'Reminders');
      await type(rows(page)[0], 'What does it know', 'Timing rules');

      const reloaded = await reload('f1');

      expect(stepTitle(reloaded)).toBe('Current Ownership');
      expect(fieldLabelled(rows(reloaded)[0], 'What does it know').value).toBe('Timing rules');
      await goTo(reloaded, 'Why');
      expect(fieldLabelled(reloaded, 'Who benefits').value).toBe('The desk stops phoning');
      await goTo(reloaded, 'Change');
      expect(fieldLabelled(reloaded, 'What is changing').value).toBe('A patient can cancel by replying CANCEL');
      await reveal('What kind of change');
      expect(chosenRadio(reloaded)).toContain('New');
    });

    it('challenges each step with its own prompts, from the workflow data', async () => {
      const page = await open('f1');
      await goTo(page, 'Leakage/Coupling Check');
      const step = workflowFor('feature-change').steps[7];

      expect(stepTitle(page)).toBe('Leakage/Coupling Check');
      expect([...page.querySelectorAll('.step__challenges li')].map((item) => item.textContent)).toEqual([...step.challenges]);
    });

    it('draws the diagram each step declares, from the same model', async () => {
      const page = await open('f1');
      await goTo(page, 'Affected Concepts');
      expect(caption(page)).toBe('Domain model');

      await goTo(page, 'Current Ownership');
      await addRow(page, 'module', 0, 'Module', 'Reminders');
      expect(caption(page)).toBe('Modules');
      await settle();
      expect(diagrams.drawings.at(-1)?.source).toContain('"Reminders');

      await goTo(page, 'Architecture Impact');
      expect(caption(page)).toBe('Dependencies');
      await goTo(page, 'Why');
      expect(panel(page)).toBeNull();
    });

    it('draws the chosen behaviour on its Smallest Safe Implementation step', async () => {
      const page = await open('f1');
      await goTo(page, 'Desired Behavior');
      await addRow(page, 'use case', 0, 'Use case', 'Patient cancels by text');
      await goTo(page, 'Smallest Safe Implementation');
      expect(caption(page)).toBe('First vertical slice');
      expect(panel(page)?.textContent).toContain('Choose the use case to build first');

      await choose(page, 'Which desired behaviour will you deliver first', 0);
      await settle();

      const source = diagrams.drawings.at(-1)?.source ?? '';
      expect(source).toContain('(["Patient cancels by text"])');
      expect(source).not.toContain('subgraph');
    });

    it('can be completed from the first step to the last, every step ending up done', async () => {
      const page = await open('f1');

      await walk(page);

      expect(stepTitle(page)).toBe('Review');
      expect(page.textContent).toContain('Step 14 of 14');
      await reveal('What should be refactored');
      expect(navButtons(page)).toEqual(['Back']);
      const states = [...page.querySelectorAll('.rail__step')].map(
        (step) => step.querySelector('.rail__state')?.textContent ?? '',
      );
      expect(states).toHaveLength(14);
      expect(states.slice(0, 13).every((state) => state === ', done')).toBe(true);
      expect(page.querySelector('.step__status')?.textContent).toBe('Every required question on this step is answered.');
    }, WALK_TIMEOUT);

    it('is all still there after a reload', async () => {
      const page = await open('f1');
      await walk(page);

      const reloaded = await reload('f1');

      expect(stepTitle(reloaded)).toBe('Review');
      await goTo(reloaded, 'Recommended Design');
      expect(chosenRadio(reloaded)).toBe('Interpret in Reminders');
      await goTo(reloaded, 'Architecture Impact');
      expect(references(rows(reloaded)[0])).toEqual([{ label: 'Messaging', checked: true }]);
    }, WALK_TIMEOUT);
  });
});
