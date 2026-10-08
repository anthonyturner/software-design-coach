import { ProjectStorageError } from '../../app/project-repository';
import type { ProjectRepository } from '../../app/project-repository';
import type { Project, ProjectSummary, StoredProject } from '../../domain';

/**
 * Stands in for a repository that is fetched on first use, so the code behind it, and the domain it
 * drags in, stay out of the initial bundle. The port is already promise-based (ADR-0008), which is
 * what lets the wait hide inside every call. A repository that cannot be fetched rejects as
 * `unavailable` and is fetched again on the next call.
 */
export class DeferredProjectRepository implements ProjectRepository {
  private loaded: Promise<ProjectRepository> | undefined;

  constructor(private readonly fetch: () => Promise<ProjectRepository>) {}

  list(): Promise<readonly ProjectSummary[]> {
    return this.repository().then((repository) => repository.list());
  }

  load(id: string): Promise<StoredProject | undefined> {
    return this.repository().then((repository) => repository.load(id));
  }

  save(project: Project): Promise<void> {
    return this.repository().then((repository) => repository.save(project));
  }

  remove(id: string): Promise<void> {
    return this.repository().then((repository) => repository.remove(id));
  }

  private repository(): Promise<ProjectRepository> {
    this.loaded ??= this.fetch().catch((error: unknown) => {
      this.loaded = undefined;
      throw new ProjectStorageError('unavailable', { cause: error });
    });
    return this.loaded;
  }
}
