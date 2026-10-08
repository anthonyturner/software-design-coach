import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import { PROJECT_REPOSITORY } from '../../app/project-repository';
import { InMemoryProjectRepository } from '../../app/testing/in-memory-project-repository';
import { createProject, goTo as moveTo, workflowFor } from '../../domain';
import { WizardComponent } from './wizard.component';

describe('WizardComponent', () => {
  let repository: InMemoryProjectRepository;
  let harness: RouterTestingHarness;

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: PROJECT_REPOSITORY, useValue: repository },
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

  async function type(scope: ParentNode, label: string, text: string): Promise<void> {
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

  const stepTitle = (page: HTMLElement): string | undefined => page.querySelector('.step__title')?.textContent?.trim();

  beforeEach(async () => {
    repository = new InMemoryProjectRepository();
    await repository.save(
      createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now: '2026-10-08T09:00:00.000Z' }),
    );
    configure();
  });

  it('shows the first step with its framing, questions and challenges from the workflow data', async () => {
    const page = await open('p1');
    const problem = workflowFor('new-project').steps[0];

    expect(page.querySelector('.wizard__title')?.textContent).toBe('Reminders');
    expect(stepTitle(page)).toBe('Problem');
    expect(page.querySelector('.step__think')?.textContent).toBe(problem.think);
    for (const question of problem.questions) {
      expect(fieldLabelled(page, question.prompt)).toBeTruthy();
    }
    expect(page.querySelectorAll('.step__challenges li')).toHaveLength(problem.challenges.length);
  });

  it('shows Think, Decide, Challenge and Continue on a step', async () => {
    const page = await open('p1');

    expect([...page.querySelectorAll('.step__label')].map((label) => label.textContent)).toEqual([
      'Think',
      'Decide',
      'Challenge',
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
    await press(page, 'Continue');

    expect(stepTitle(page)).toBe('Users');
    expect(page.textContent).toContain('Step 2 of 9');

    await press(page, 'Add actor');
    await type(page, 'Role', 'Receptionist');
    await press(page, 'Back');

    expect(stepTitle(page)).toBe('Problem');
    expect(fieldLabelled(page, 'What problem are we solving').value).toBe('No-shows cost us chairs');
  });

  it('autosaves answers and the current step, so a reload resumes', async () => {
    const page = await open('p1');
    await type(page, 'What problem are we solving', 'No-shows cost us chairs');
    await press(page, 'Continue');
    await press(page, 'Add actor');
    await type(page, 'Role', 'Receptionist');

    const reloaded = await reload('p1');

    expect(stepTitle(reloaded)).toBe('Users');
    expect(fieldLabelled(reloaded, 'Role').value).toBe('Receptionist');
    await press(reloaded, 'Back');
    expect(fieldLabelled(reloaded, 'What problem are we solving').value).toBe('No-shows cost us chairs');
  });

  it('offers no Continue after the last step, and no Back on the first', async () => {
    const page = await open('p1');
    expect(navButtons(page)).toEqual(['Continue']);

    for (let step = 1; step < workflowFor('new-project').steps.length; step++) {
      await press(page, 'Continue');
    }

    expect(stepTitle(page)).toBe('Modules');
    expect(navButtons(page)).toEqual(['Back']);
  });

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
    it('lists all nine steps in a labelled navigation, with the step you are on marked', async () => {
      const page = await open('p1');

      expect(page.querySelector('nav')?.getAttribute('aria-label')).toBe('Design journey');
      expect(page.querySelectorAll('.rail__step')).toHaveLength(9);
      expect(railButton(page, 'Problem').getAttribute('aria-current')).toBe('step');
      expect(railState(page, 'Modules')).toBe(', not started');
    });

    it('goes to any step when clicked, in any order, and brings the answers with it', async () => {
      const page = await open('p1');
      await type(page, 'What problem are we solving', 'No-shows cost us chairs');

      await goTo(page, 'Modules');
      expect(stepTitle(page)).toBe('Modules');
      expect(page.textContent).toContain('Step 9 of 9');
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

      await click(radios(page)[1]);

      expect(page.querySelector('legend.field__label')?.textContent).toBe('What kind of thing are you building?');
      expect(radios(page).map((option) => option.checked)).toEqual([false, true, false, false, false]);
    });

    it('keeps the lists and the choice across a reload', async () => {
      const page = await open('p1');
      await twoActors(page);
      await goTo(page, 'System Boundary');
      await click(radios(page)[1]);

      const reloaded = await reload('p1');
      expect(radios(reloaded)[1].checked).toBe(true);
      await goTo(reloaded, 'Users');

      expect(rows(reloaded).map((row) => fieldLabelled(row, 'Role').value)).toEqual(['Receptionist', 'Patient']);
    });
  });
});
