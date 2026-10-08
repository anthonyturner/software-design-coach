import { createProject } from '../../domain';
import { ProjectStorageError } from '../../app/project-repository';
import type { ProjectRepository } from '../../app/project-repository';
import { InMemoryProjectRepository } from '../../app/testing/in-memory-project-repository';
import { DeferredProjectRepository } from './deferred-project-repository';

const now = '2026-10-08T09:00:00.000Z';

describe('DeferredProjectRepository', () => {
  let underlying: InMemoryProjectRepository;
  let load: ReturnType<typeof vi.fn<() => Promise<ProjectRepository>>>;
  let repository: DeferredProjectRepository;

  beforeEach(() => {
    underlying = new InMemoryProjectRepository();
    load = vi.fn(() => Promise.resolve(underlying));
    repository = new DeferredProjectRepository(load);
  });

  it('loads nothing until it is used, so it costs nothing at start-up', () => {
    expect(load).not.toHaveBeenCalled();
  });

  it('does what the repository it stands for does, through every operation', async () => {
    await repository.save(createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now }));

    expect((await repository.list()).map((summary) => summary.name)).toEqual(['Reminders']);
    expect((await repository.load('p1'))?.['name']).toBe('Reminders');
    expect(await underlying.load('p1')).toBeDefined();

    await repository.remove('p1');

    expect(await repository.list()).toEqual([]);
  });

  it('loads the repository once, however many calls arrive while it loads', async () => {
    await Promise.all([repository.list(), repository.list(), repository.load('p1')]);
    await repository.list();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports a repository that cannot be loaded as unavailable storage', async () => {
    load.mockRejectedValueOnce(new Error('Failed to fetch the chunk'));

    const failure = await repository.list().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ProjectStorageError);
    expect(failure).toMatchObject({ reason: 'unavailable' });
  });

  it('tries again on the next call after a failed load, since the network may be back', async () => {
    load.mockRejectedValueOnce(new Error('offline'));
    await repository.list().catch(() => undefined);

    expect(await repository.list()).toEqual([]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('passes on the failures of the repository itself, untouched', async () => {
    const full = new ProjectStorageError('quota-exceeded');
    load.mockResolvedValue({
      list: () => Promise.reject(full),
      load: (id) => underlying.load(id),
      save: (project) => underlying.save(project),
      remove: (id) => underlying.remove(id),
    });

    await expect(repository.list()).rejects.toBe(full);
  });
});
