import { isStoredProject, migrateProject, summarize } from '../../domain';
import type { Project, ProjectSummary, StoredProject } from '../../domain';
import type { ProjectRepository } from '../project-repository';

/** Keeps projects as JSON text, like real storage, so a test cannot lean on shared object references. */
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly texts = new Map<string, string>();

  list(): Promise<readonly ProjectSummary[]> {
    const summaries = [...this.texts.values()].flatMap((text) => {
      const parsed: unknown = JSON.parse(text);
      const project = isStoredProject(parsed) ? migrateProject(parsed) : undefined;
      return project ? [summarize(project)] : [];
    });
    return Promise.resolve(summaries);
  }

  load(id: string): Promise<StoredProject | undefined> {
    const text = this.texts.get(id);
    const parsed: unknown = text === undefined ? undefined : JSON.parse(text);
    return Promise.resolve(isStoredProject(parsed) ? parsed : undefined);
  }

  save(project: Project): Promise<void> {
    this.texts.set(project.id, JSON.stringify(project));
    return Promise.resolve();
  }

  remove(id: string): Promise<void> {
    this.texts.delete(id);
    return Promise.resolve();
  }
}
