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

  const buttonsIn = (scope: HTMLElement): (string | undefined)[] =>
    Array.from(scope.querySelectorAll('button')).map((button) => button.textContent?.trim());

  const chosenRadio = (page: HTMLElement): string | undefined =>
    radios(page).find((option) => option.checked)?.closest('label')?.textContent?.trim();

  const legends = (page: HTMLElement): (string | undefined)[] =>
    Array.from(page.querySelectorAll('.entity__legend')).map((legend) => legend.textContent?.trim());

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
    expect(page.textContent).toContain('Step 2 of 19');

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

    expect(stepTitle(page)).toBe('Design Review');
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
      await click(radios(page)[1]);

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
      await click(radios(page)[0]);

      expect(chosenRadio(page)).toBe('Confirm an appointment');
    });
  });

  describe('the whole workflow', () => {
    async function addRow(page: HTMLElement, noun: string, index: number, label: string, name: string): Promise<void> {
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
      await press(page, 'Continue');
      await addRow(page, 'actor', 0, 'Role', 'Receptionist');
      await press(page, 'Continue');
      await fill(page, [
        ['What must be true when this succeeds', 'Patients are reminded'],
        ['For each goal, what would you observe', 'No reminder calls'],
      ]);
      await press(page, 'Continue');
      await fill(page, [['What will this system deliberately not do', 'Online booking']]);
      await press(page, 'Continue');
      await fill(page, [['What must the system do', 'Send a text the day before']]);
      await press(page, 'Continue');
      await addRow(page, 'use case', 0, 'Use case', 'Confirm an appointment');
      await press(page, 'Continue');
      await addRow(page, 'concept', 0, 'Concept', 'Appointment');
      await press(page, 'Continue');
      await click(radios(page)[0]);
      await fill(page, [['what is yours to build and own', 'Reminder rules']]);
      await press(page, 'Continue');
      await addRow(page, 'module', 0, 'Module', 'Reminders');
      await addRow(page, 'module', 1, 'Module', 'Messaging');
      await press(page, 'Continue');
      await type(rows(page)[0], 'What is it responsible for?', 'Decide when one is due');
      await press(page, 'Continue');
      await type(rows(page)[1], 'What does it know', 'The provider and its formats');
      await press(page, 'Continue');
      await type(rows(page)[1], 'What does a caller need', 'send(patient, message)');
      await press(page, 'Continue');
      await pickReference(rows(page)[0], 'Messaging');
      await press(page, 'Continue');
      await addRow(page, 'architecture option', 0, 'Option', 'Four modules');
      await addRow(page, 'architecture option', 1, 'Option', 'One module');
      await fill(page, [['How do they compare', 'The first hides more']]);
      await press(page, 'Continue');
      await click(radios(page)[0]);
      await fill(page, [['Why this one', 'Different reasons to change']]);
      await press(page, 'Continue');
      await click(radios(page)[0]);
      await fill(page, [
        ['Trace it through the modules', 'Reminders asks Messaging to send'],
        ['What will you know after building it', 'Whether the provider can be hidden'],
      ]);
      await press(page, 'Continue');
      await fill(page, [
        ['What behaviours must the first slice show', 'A reminder is sent a day before'],
        ['first test you will write', 'dueReminders returns one reminder'],
      ]);
      await press(page, 'Continue');
      await fill(page, [['What are the steps, in order', 'Reminders first, with a fake schedule']]);
      await press(page, 'Continue');
      await fill(page, [
        ['least sure about', 'Reminders may do too much'],
        ['biggest risks', 'The provider reply format'],
      ]);
      await click(radios(page)[1]);
    }

    it('can be completed from the first step to the last, every step ending up done', async () => {
      const page = await open('p1');

      await walk(page);

      expect(stepTitle(page)).toBe('Design Review');
      expect(page.textContent).toContain('Step 19 of 19');
      expect(navButtons(page)).toEqual(['Back']);
      const states = [...page.querySelectorAll('.rail__step')].map(
        (step) => step.querySelector('.rail__state')?.textContent ?? '',
      );
      expect(states).toHaveLength(19);
      expect(states.slice(0, 18).every((state) => state === ', done')).toBe(true);
      expect(page.querySelector('.step__status')?.textContent).toBe('Every required question on this step is answered.');
    });

    it('is all still there after a reload', async () => {
      const page = await open('p1');
      await walk(page);

      const reloaded = await reload('p1');

      expect(stepTitle(reloaded)).toBe('Design Review');
      expect(chosenRadio(reloaded)).toContain('with the risks above');
      await goTo(reloaded, 'Dependencies');
      expect(references(rows(reloaded)[0])).toEqual([{ label: 'Messaging', checked: true }]);
      await goTo(reloaded, 'Decision');
      expect(chosenRadio(reloaded)).toBe('Four modules');
    });
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
});
