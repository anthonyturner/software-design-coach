import { TestBed } from '@angular/core/testing';
import { PROJECT_CLOCK, PROJECT_ID_GENERATOR } from './project-environment';
import { PROJECT_REPOSITORY, ProjectStorageError } from './project-repository';
import type { ProjectRepository } from './project-repository';
import { AUTOSAVE_DELAY_MS, ProjectStore } from './project-store';
import { InMemoryProjectRepository } from './testing/in-memory-project-repository';

describe('ProjectStore', () => {
  let repository: InMemoryProjectRepository;
  let clock: number;
  let nextId: number;

  function configure(target: ProjectRepository = repository): ProjectStore {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PROJECT_REPOSITORY, useValue: target },
        { provide: PROJECT_CLOCK, useValue: () => new Date(Date.UTC(2026, 9, 8, 9, 0, clock++)).toISOString() },
        { provide: PROJECT_ID_GENERATOR, useValue: () => `p${nextId++}` },
      ],
    });
    return TestBed.inject(ProjectStore);
  }

  async function storedAnswers(id: string): Promise<unknown> {
    return (await repository.load(id))?.['answers'];
  }

  beforeEach(() => {
    repository = new InMemoryProjectRepository();
    clock = 0;
    nextId = 1;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('creating a project', () => {
    it('opens it on the first step and lists it', async () => {
      const store = configure();

      const id = await store.create('Reminders', 'new-project');

      expect(id).toBe('p1');
      expect(store.project()?.name).toBe('Reminders');
      expect(store.currentStep()?.id).toBe('problem');
      expect(store.projects().map((project) => project.name)).toEqual(['Reminders']);
    });

    it('saves it straight away, before anything is answered', async () => {
      const store = configure();

      const id = await store.create('Reminders', 'new-project');

      expect((await repository.load(id))?.['name']).toBe('Reminders');
    });

    it('follows the workflow of the mode chosen, for the step, the journey and the count', async () => {
      const store = configure();

      await store.create('Cancel by text', 'feature-change');

      expect(store.workflow()?.title).toBe('Feature / Change');
      expect(store.currentStep()?.id).toBe('change');
      expect(store.journey()).toHaveLength(14);
      expect(store.openQuestionCount()).toBe(2);
    });

    it('resumes a Feature / Change project from storage on its own step, with its answers', async () => {
      const first = configure();
      const id = await first.create('Cancel by text', 'feature-change');
      first.answer('change', 'change', 'A patient can cancel by replying CANCEL');
      first.goTo('why');
      await first.flush();

      const second = configure();
      await second.open(id);

      expect(second.currentStep()?.id).toBe('why');
      expect(second.project()?.answers['change']?.['change']).toBe('A patient can cancel by replying CANCEL');
      expect(second.openState()).toBe('open');
    });

    it('lists the most recently changed project first', async () => {
      const store = configure();
      await store.create('Older', 'new-project');
      await store.create('Newer', 'new-project');

      expect(store.projects().map((project) => project.name)).toEqual(['Newer', 'Older']);
    });
  });

  describe('answering', () => {
    it('shows the answer at once and saves it after a pause', async () => {
      const store = configure();
      const id = await store.create('Reminders', 'new-project');

      store.answer('problem', 'problem', 'No-shows cost chairs');

      expect(store.project()?.answers['problem']?.['problem']).toBe('No-shows cost chairs');
      expect(await storedAnswers(id)).toEqual({});

      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);

      expect(await storedAnswers(id)).toEqual({ problem: { problem: 'No-shows cost chairs' } });
    });

    it('saves once for a burst of keystrokes, with the latest text', async () => {
      const store = configure();
      const id = await store.create('Reminders', 'new-project');
      const save = vi.spyOn(repository, 'save');

      store.answer('problem', 'problem', 'N');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
      store.answer('problem', 'problem', 'No');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);

      expect(save).toHaveBeenCalledTimes(1);
      expect(await storedAnswers(id)).toEqual({ problem: { problem: 'No' } });
    });

    it('saves when the page is hidden, without waiting for the pause', async () => {
      const store = configure();
      const id = await store.create('Reminders', 'new-project');

      store.answer('problem', 'problem', 'Typed just before a reload');
      window.dispatchEvent(new Event('pagehide'));
      await vi.advanceTimersByTimeAsync(0);

      expect(await storedAnswers(id)).toEqual({ problem: { problem: 'Typed just before a reload' } });
    });

    it('does nothing when no project is open', async () => {
      const store = configure();
      const save = vi.spyOn(repository, 'save');

      store.answer('problem', 'problem', 'x');
      await store.flush();

      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('editing entities', () => {
    async function withActors(): Promise<{ store: ProjectStore; id: string }> {
      const store = configure();
      const id = await store.create('Reminders', 'new-project');
      store.changeEntities('actor', { type: 'add' });
      store.changeEntities('actor', { type: 'add' });
      const [first, second] = (store.project()?.entities.actor ?? []).map((actor) => actor.id);
      store.changeEntities('actor', { type: 'edit', id: first, edit: { name: 'Receptionist' } });
      store.changeEntities('actor', { type: 'edit', id: second, edit: { name: 'Patient' } });
      return { store, id };
    }

    const names = (store: ProjectStore): string[] => (store.project()?.entities.actor ?? []).map((actor) => actor.name);

    it('adds a row with an id the store makes up, and shows it at once', async () => {
      const { store } = await withActors();

      expect(store.project()?.entities.actor.map((actor) => actor.id)).toEqual(['p2', 'p3']);
      expect(names(store)).toEqual(['Receptionist', 'Patient']);
    });

    it('saves entity changes after the same pause as answers', async () => {
      const { id } = await withActors();
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);

      const stored = await repository.load(id);

      expect(JSON.stringify(stored?.['entities'])).toContain('Receptionist');
    });

    it('reorders and removes rows, and cleans references to a removed one', async () => {
      const { store } = await withActors();
      const [first, second] = (store.project()?.entities.actor ?? []).map((actor) => actor.id);
      store.changeEntities('use-case', { type: 'add' });
      const useCase = store.project()?.entities['use-case'][0].id ?? '';
      store.changeEntities('use-case', { type: 'edit', id: useCase, edit: { fields: { actors: [first, second] } } });

      store.changeEntities('actor', { type: 'move', id: second, offset: -1 });
      expect(names(store)).toEqual(['Patient', 'Receptionist']);

      store.changeEntities('actor', { type: 'remove', id: first });
      expect(names(store)).toEqual(['Patient']);
      expect(store.project()?.entities['use-case'][0].fields['actors']).toEqual([second]);
    });

    it('does not save when an edit changes nothing', async () => {
      const { store } = await withActors();
      await store.flush();
      const save = vi.spyOn(repository, 'save');
      const [first] = (store.project()?.entities.actor ?? []).map((actor) => actor.id);

      store.changeEntities('actor', { type: 'edit', id: first, edit: { name: 'Receptionist' } });
      store.changeEntities('actor', { type: 'move', id: first, offset: -1 });
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);

      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('the open question count', () => {
    it('is zero with no project, then counts the required questions the current step still lacks', async () => {
      const store = configure();
      expect(store.openQuestionCount()).toBe(0);

      await store.create('Reminders', 'new-project');
      expect(store.openQuestionCount()).toBe(3);

      store.answer('problem', 'problem', 'No-shows');
      expect(store.openQuestionCount()).toBe(2);

      store.goTo('users');
      expect(store.openQuestionCount()).toBe(1);
    });
  });

  describe('the journey', () => {
    it('is empty until a project is open, then follows the answers and the current step', async () => {
      const store = configure();
      expect(store.journey()).toEqual([]);

      await store.create('Reminders', 'new-project');
      expect(store.journey()[0]).toMatchObject({ stepId: 'problem', state: 'current' });

      store.goTo('users');
      expect(store.journey()[0].state).toBe('not-started');
      expect(store.journey()[1].state).toBe('current');
    });
  });

  describe('moving between steps', () => {
    it('remembers the current step', async () => {
      const store = configure();
      const id = await store.create('Reminders', 'new-project');

      store.goTo('users');
      await store.flush();

      expect(store.currentStep()?.id).toBe('users');
      expect((await repository.load(id))?.['currentStepId']).toBe('users');
    });
  });

  describe('opening a project after a reload', () => {
    async function savedWithAnswers(): Promise<string> {
      const before = configure();
      const id = await before.create('Reminders', 'new-project');
      before.answer('problem', 'problem', 'No-shows cost chairs');
      before.answer('goals', 'goals', ['fewer no-shows', 'no reminder calls']);
      before.changeEntities('actor', { type: 'add' });
      before.changeEntities('actor', { type: 'edit', id: 'p2', edit: { name: 'Receptionist' } });
      before.goTo('users');
      await before.flush();
      return id;
    }

    it('returns to the last step with every answer intact', async () => {
      const id = await savedWithAnswers();

      const after = configure();
      await after.open(id);

      expect(after.openState()).toBe('open');
      expect(after.currentStep()?.id).toBe('users');
      expect(after.project()?.answers).toEqual({
        problem: { problem: 'No-shows cost chairs' },
        goals: { goals: ['fewer no-shows', 'no reminder calls'] },
      });
      expect(after.project()?.entities.actor.map((actor) => actor.name)).toEqual(['Receptionist']);
    });

    it('lists the saved project', async () => {
      await savedWithAnswers();

      const after = configure();
      await after.refresh();

      expect(after.projects().map((project) => project.name)).toEqual(['Reminders']);
    });

    it('does not reload a project that is already open', async () => {
      const store = configure();
      const id = await store.create('Reminders', 'new-project');
      const load = vi.spyOn(repository, 'load');

      await store.open(id);

      expect(load).not.toHaveBeenCalled();
    });

    it('says so when the project is not in this browser', async () => {
      const store = configure();

      await store.open('missing');

      expect(store.openState()).toBe('not-found');
      expect(store.project()).toBeUndefined();
    });

    it('says so when the project was written by a newer version', async () => {
      const writer = configure();
      await writer.create('Reminders', 'new-project');
      const project = writer.project();
      if (!project) {
        throw new Error('the project should be open');
      }
      await repository.save({ ...project, schemaVersion: 99 });

      const store = configure();
      await store.open(project.id);

      expect(store.openState()).toBe('unreadable');
      expect(store.project()).toBeUndefined();
    });

    it('saves the project it was on before creating another', async () => {
      const store = configure();
      const first = await store.create('First', 'new-project');
      store.answer('problem', 'problem', 'unsaved edit');

      const second = await store.create('Second', 'new-project');

      expect(await storedAnswers(first)).toEqual({ problem: { problem: 'unsaved edit' } });
      expect(store.project()?.id).toBe(second);
    });
  });

  describe('when storage fails', () => {
    function withSave(save: ProjectRepository['save']): ProjectRepository {
      return {
        list: () => repository.list(),
        load: (id) => repository.load(id),
        save,
        remove: (id) => repository.remove(id),
      };
    }

    it('surfaces a full browser instead of swallowing it', async () => {
      const store = configure(withSave(() => Promise.reject(new ProjectStorageError('quota-exceeded'))));

      await store.create('Reminders', 'new-project');

      expect(store.problem()).toBe('quota-exceeded');
      expect(store.project()?.name).toBe('Reminders');
    });

    it('reports any other failure as storage being unavailable', async () => {
      const store = configure(withSave(() => Promise.reject(new Error('boom'))));

      await store.create('Reminders', 'new-project');

      expect(store.problem()).toBe('unavailable');
    });

    it('clears the problem once a save works again', async () => {
      let full = true;
      const store = configure(
        withSave((project) => (full ? Promise.reject(new ProjectStorageError('quota-exceeded')) : repository.save(project))),
      );
      await store.create('Reminders', 'new-project');
      expect(store.problem()).toBe('quota-exceeded');

      full = false;
      store.answer('problem', 'problem', 'second try');
      await store.flush();

      expect(store.problem()).toBeUndefined();
    });

    it('reports a list that cannot be read', async () => {
      const store = configure({
        list: () => Promise.reject(new ProjectStorageError('unavailable')),
        load: (id) => repository.load(id),
        save: (project) => repository.save(project),
        remove: (id) => repository.remove(id),
      });

      await store.refresh();

      expect(store.problem()).toBe('unavailable');
      expect(store.projects()).toEqual([]);
    });
  });
});
