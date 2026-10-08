import { ProjectStorageError } from '../../app/project-repository';
import type { ProjectRepository } from '../../app/project-repository';
import type { Project, ProjectSummary, StoredProject } from '../../domain';

/**
 * Stands in for a repository that is loaded in the background, so the code behind it, and the domain
 * it drags in, stay out of the initial bundle. Loading starts when this is made, which is before any
 * call could need it, and the port is already promise-based (ADR-0008), which is what lets a call
 * that does arrive early simply wait. A repository that cannot be loaded rejects as `unavailable`
 * and is loaded again on the next call.
 */
export class DeferredProjectRepository implements ProjectRepository {
  private loaded: Promise<ProjectRepository> | undefined;

  constructor(private readonly loadRepository: () => Promise<ProjectRepository>) {
    // A failure is not lost: the next call finds nothing loaded, tries again and reports it to its caller.
    this.repository().catch(() => undefined);
  }

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
    this.loaded ??= this.loadRepository().catch((error: unknown) => {
      this.loaded = undefined;
      throw new ProjectStorageError('unavailable', { cause: error });
    });
    return this.loaded;
  }
}
