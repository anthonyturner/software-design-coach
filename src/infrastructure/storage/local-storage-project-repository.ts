import { isProjectSummary, isStoredProject, migrateProject, summarize } from '../../domain';
import type { Project, ProjectSummary, StoredProject } from '../../domain';
import { ProjectStorageError } from '../../app/project-repository';
import type { ProjectRepository } from '../../app/project-repository';

const PROJECT_KEY_PREFIX = 'design-coach:project:';
const INDEX_KEY = 'design-coach:index';

/**
 * One key per project plus an index of summaries (ADR-0008). A project is written before the
 * index, so a failure in between leaves a project the index does not name. `list()` treats the
 * project keys as the truth and repairs the index whenever the two disagree.
 */
export class LocalStorageProjectRepository implements ProjectRepository {
  constructor(private readonly storage: Storage) {}

  list(): Promise<readonly ProjectSummary[]> {
    return attempt(() => this.readList());
  }

  load(id: string): Promise<StoredProject | undefined> {
    return attempt(() => {
      const text = this.storage.getItem(projectKey(id));
      if (text === null) {
        return undefined;
      }
      const parsed = parseJson(text);
      if (!isStoredProject(parsed)) {
        throw new ProjectStorageError('unreadable');
      }
      return parsed;
    });
  }

  save(project: Project): Promise<void> {
    return attempt(() => {
      this.storage.setItem(projectKey(project.id), JSON.stringify(project));
      const others = (this.readIndex() ?? []).filter((summary) => summary.id !== project.id);
      this.writeIndex([...others, summarize(project)]);
    });
  }

  remove(id: string): Promise<void> {
    return attempt(() => {
      this.storage.removeItem(projectKey(id));
      this.writeIndex((this.readIndex() ?? []).filter((summary) => summary.id !== id));
    });
  }

  private readList(): readonly ProjectSummary[] {
    const storedIds = this.storedIds();
    const indexed = this.readIndex();
    if (indexed && sameIds(indexed, storedIds)) {
      return indexed;
    }
    const rebuilt = storedIds.flatMap((id) => {
      const summary = this.readSummary(id);
      return summary ? [summary] : [];
    });
    try {
      this.writeIndex(rebuilt);
    } catch (error: unknown) {
      // The index only caches the project keys, so a repair that does not fit is redone by the next list().
      if (!isQuotaError(error)) {
        throw error;
      }
    }
    return rebuilt;
  }

  private storedIds(): string[] {
    const ids: string[] = [];
    for (let position = 0; position < this.storage.length; position++) {
      const key = this.storage.key(position);
      if (key?.startsWith(PROJECT_KEY_PREFIX)) {
        ids.push(key.slice(PROJECT_KEY_PREFIX.length));
      }
    }
    return ids;
  }

  private readIndex(): ProjectSummary[] | undefined {
    const text = this.storage.getItem(INDEX_KEY);
    const parsed = text === null ? undefined : parseJson(text);
    return Array.isArray(parsed) && parsed.every(isProjectSummary) ? parsed : undefined;
  }

  private writeIndex(summaries: readonly ProjectSummary[]): void {
    this.storage.setItem(INDEX_KEY, JSON.stringify(summaries));
  }

  private readSummary(id: string): ProjectSummary | undefined {
    const text = this.storage.getItem(projectKey(id));
    const stored = text === null ? undefined : parseJson(text);
    const project = isStoredProject(stored) ? migrateProject(stored) : undefined;
    return project && summarize(project);
  }
}

function projectKey(id: string): string {
  return PROJECT_KEY_PREFIX + id;
}

function sameIds(summaries: readonly ProjectSummary[], ids: readonly string[]): boolean {
  return summaries.length === ids.length && summaries.every((summary) => ids.includes(summary.id));
}

/** Text that is not JSON counts as nothing stored: callers decide whether that is an error. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
}

function attempt<T>(work: () => T): Promise<T> {
  try {
    return Promise.resolve(work());
  } catch (error: unknown) {
    return Promise.reject(asStorageError(error));
  }
}

function asStorageError(error: unknown): ProjectStorageError {
  if (error instanceof ProjectStorageError) {
    return error;
  }
  return new ProjectStorageError(isQuotaError(error) ? 'quota-exceeded' : 'unavailable', { cause: error });
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}
