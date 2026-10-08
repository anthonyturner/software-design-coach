import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import { PROJECT_REPOSITORY } from '../../app/project-repository';
import { InMemoryProjectRepository } from '../../app/testing/in-memory-project-repository';
import { createProject, goTo, workflowFor } from '../../domain';
import { WizardComponent } from './wizard.component';

describe('WizardComponent', () => {
  let repository: InMemoryProjectRepository;
  let harness: RouterTestingHarness;

  async function open(id: string): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/projects/${id}`, WizardComponent);
    await settle();
    return routeElement();
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

  async function type(page: HTMLElement, label: string, text: string): Promise<void> {
    const field = fieldLabelled(page, label);
    field.value = text;
    field.dispatchEvent(new Event('input'));
    await settle();
  }

  function fieldLabelled(page: HTMLElement, label: string): HTMLInputElement | HTMLTextAreaElement {
    const found = [...page.querySelectorAll('label')].find((element) => element.textContent?.includes(label));
    const field = found && page.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${found.getAttribute('for')}`);
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
    button.click();
    await settle();
  }

  const stepTitle = (page: HTMLElement): string | undefined => page.querySelector('.step__title')?.textContent?.trim();

  beforeEach(async () => {
    repository = new InMemoryProjectRepository();
    await repository.save(createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now: '2026-10-08T09:00:00.000Z' }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: PROJECT_REPOSITORY, useValue: repository },
      ],
    });
  });

  it('shows the first step with its why, questions and challenges from the workflow data', async () => {
    const page = await open('p1');
    const problem = workflowFor('new-project').steps[0];

    expect(page.querySelector('.wizard__title')?.textContent).toBe('Reminders');
    expect(stepTitle(page)).toBe('Problem');
    expect(page.querySelector('.step__why')?.textContent).toBe(problem.why);
    for (const question of problem.questions) {
      expect(fieldLabelled(page, question.prompt)).toBeTruthy();
    }
    expect(page.querySelectorAll('.step__challenges li')).toHaveLength(problem.challenges.length);
  });

  it('keeps the example behind a disclosure until asked', async () => {
    const page = await open('p1');
    const example = page.querySelector('details');

    expect(example?.open).toBe(false);
    expect(example?.querySelector('summary')?.textContent).toBe('Show me an example');
  });

  it('carries an answer through Continue and Back, one step at a time', async () => {
    const page = await open('p1');

    await type(page, 'What problem are we solving', 'No-shows cost us chairs');
    await press(page, 'Continue');

    expect(stepTitle(page)).toBe('Users');
    expect(page.textContent).toContain('Step 2 of 3');

    await type(page, 'Who uses this system', 'receptionist\n\npatient');
    await press(page, 'Back');

    expect(stepTitle(page)).toBe('Problem');
    expect(fieldLabelled(page, 'What problem are we solving').value).toBe('No-shows cost us chairs');
  });

  it('autosaves answers and the current step, so a reload resumes', async () => {
    const page = await open('p1');
    await type(page, 'What problem are we solving', 'No-shows cost us chairs');
    await press(page, 'Continue');
    await type(page, 'Who uses this system', 'receptionist\npatient');
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: PROJECT_REPOSITORY, useValue: repository },
      ],
    });
    const reloaded = await open('p1');

    expect(stepTitle(reloaded)).toBe('Users');
    expect(fieldLabelled(reloaded, 'Who uses this system').value).toBe('receptionist\npatient');
    await press(reloaded, 'Back');
    expect(fieldLabelled(reloaded, 'What problem are we solving').value).toBe('No-shows cost us chairs');
  });

  it('offers no Continue after the last step, and no Back on the first', async () => {
    const page = await open('p1');
    expect([...page.querySelectorAll('button')].map((button) => button.textContent?.trim())).toEqual(['Continue']);

    await press(page, 'Continue');
    await press(page, 'Continue');

    expect(stepTitle(page)).toBe('Goals');
    expect([...page.querySelectorAll('button')].map((button) => button.textContent?.trim())).toEqual(['Back']);
  });

  it('opens a project at the step it was left on', async () => {
    const saved = goTo(
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
});
