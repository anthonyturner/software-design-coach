import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import { PROJECT_REPOSITORY, ProjectStorageError } from '../../app/project-repository';
import type { ProjectRepository } from '../../app/project-repository';
import { InMemoryProjectRepository } from '../../app/testing/in-memory-project-repository';
import { createProject } from '../../domain';
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
