import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import { PROJECT_REPOSITORY, ProjectStorageError } from '../../app/project-repository';
import type { ProjectRepository } from '../../app/project-repository';
import { InMemoryProjectRepository } from '../../app/testing/in-memory-project-repository';
import { createProject, workflowFor } from '../../domain';
import { ProjectListComponent } from './project-list.component';

describe('ProjectListComponent', () => {
  let repository: InMemoryProjectRepository;
  let harness: RouterTestingHarness;

  function routeElement(): HTMLElement {
    if (!(harness.routeNativeElement instanceof HTMLElement)) {
      throw new Error('the routed component should be rendered');
    }
    return harness.routeNativeElement;
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function show(target: ProjectRepository = repository): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: PROJECT_REPOSITORY, useValue: target },
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', ProjectListComponent);
    await settle();
    return routeElement();
  }

  beforeEach(() => {
    repository = new InMemoryProjectRepository();
  });

  it('invites the first project when there are none', async () => {
    const page = await show();

    expect(page.querySelector('.projects__empty')?.textContent).toContain('No projects yet');
  });

  it('lists saved projects as links to their wizard', async () => {
    await repository.save(createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now: '2026-10-08T09:00:00.000Z' }));

    const page = await show();
    const link = page.querySelector<HTMLAnchorElement>('.projects__link');

    expect(link?.textContent).toContain('Reminders');
    expect(link?.textContent).toContain('New Project');
    expect(link?.getAttribute('href')).toBe('/projects/p1');
  });

  it('creates a named project and opens it on the first step', async () => {
    const page = await show();
    const name = page.querySelector<HTMLInputElement>('#project-name');
    if (!name) {
      throw new Error('the name field should be there');
    }

    name.value = 'Order Service';
    page.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    await settle();

    const wizard = routeElement();
    expect(wizard.querySelector('.wizard__title')?.textContent).toBe('Order Service');
    expect(wizard.querySelector('.step__title')?.textContent?.trim()).toBe('Problem');
    expect((await repository.list()).map((summary) => summary.name)).toEqual(['Order Service']);
  });

  describe('choosing what to design', () => {
    const options = (page: HTMLElement): HTMLInputElement[] =>
      Array.from(page.querySelectorAll<HTMLInputElement>('.projects__create input[type="radio"]'));

    async function createNamed(page: HTMLElement, name: string): Promise<HTMLElement> {
      const field = page.querySelector<HTMLInputElement>('#project-name');
      if (!field) {
        throw new Error('the name field should be there');
      }
      field.value = name;
      page.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      await settle();
      return routeElement();
    }

    it('offers both workflows as one labelled group, each saying what it is for', async () => {
      const page = await show();
      const group = page.querySelector('.projects__create fieldset');

      expect(group?.querySelector('legend')?.textContent).toBe('What are you designing?');
      expect(options(page).map((option) => option.closest('label')?.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        expect.stringContaining('New Project'),
        expect.stringContaining('Feature / Change'),
      ]);
      expect(group?.textContent).toContain(workflowFor('feature-change').summary);
    });

    it('starts on New Project, so a name and Enter still makes one', async () => {
      const page = await show();

      expect(options(page).map((option) => option.checked)).toEqual([true, false]);
    });

    it('creates a Feature / Change project when that is chosen, and opens it on its first step', async () => {
      const page = await show();
      options(page)[1].click();
      await settle();

      const wizard = await createNamed(page, 'Cancel by text');

      expect(wizard.querySelector('.wizard__mode')?.textContent).toBe('Feature / Change');
      expect(wizard.querySelector('.step__title')?.textContent?.trim()).toBe('Change');
      expect(wizard.textContent).toContain('Step 1 of 14');
      expect((await repository.list()).map((summary) => summary.mode)).toEqual(['feature-change']);
    });

    it('lists a saved Feature / Change project under its own workflow name', async () => {
      await repository.save(
        createProject({ id: 'f1', name: 'Cancel by text', mode: 'feature-change', now: '2026-10-08T09:00:00.000Z' }),
      );

      const page = await show();

      expect(page.querySelector('.projects__meta')?.textContent).toContain('Feature / Change');
    });
  });

  it('creates one project however many times the form is submitted while it is working', async () => {
    const page = await show();
    const form = page.querySelector('form');

    form?.dispatchEvent(new Event('submit', { cancelable: true }));
    form?.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    await settle();

    expect(await repository.list()).toHaveLength(1);
  });

  it('tells the user when the browser cannot store their work', async () => {
    const full: ProjectRepository = {
      list: () => repository.list(),
      load: (id) => repository.load(id),
      save: () => Promise.reject(new ProjectStorageError('quota-exceeded')),
      remove: (id) => repository.remove(id),
    };
    const page = await show(full);

    page.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    await settle();

    expect(routeElement().querySelector('[role="alert"]')?.textContent).toContain(
      'no room left',
    );
  });
});
