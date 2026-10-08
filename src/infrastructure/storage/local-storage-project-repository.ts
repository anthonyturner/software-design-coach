import { isProjectSummary, isStoredProject, migrateProject, summarize } from '../../domain';
import type { Project, ProjectSummary, StoredProject } from '../../domain';
import { ProjectStorageError } from '../../app/project-repository';
import type { ProjectRepository } from '../../app/project-repository';

const PROJECT_KEY_PREFIX = 'design-coach:project:';
const INDEX_KEY = 'design-coach:index';

/**
 * One key per project plus an index of summaries (ADR-0008). A project is written before the
 * index, so a failure in between leaves an index that is behind. `list()` treats the project keys
 * as the truth and repairs the index whenever the two disagree.
 *
 * The storage object is resolved on every call, because merely reading `window.localStorage`
 * throws in a browser that blocks site data; that has to surface as `unavailable`.
 */
export class LocalStorageProjectRepository implements ProjectRepository {
  constructor(private readonly resolveStorage: () => Storage) {}

  list(): Promise<readonly ProjectSummary[]> {
    return this.attempt(readList);
  }

  load(id: string): Promise<StoredProject | undefined> {
    return this.attempt((storage) => {
      const text = storage.getItem(projectKey(id));
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
    return this.attempt((storage) => {
      storage.setItem(projectKey(project.id), JSON.stringify(project));
      const others = (readIndex(storage) ?? []).filter((summary) => summary.id !== project.id);
      writeIndexIfItFits(storage, [...others, summarize(project)]);
    });
  }

  remove(id: string): Promise<void> {
    return this.attempt((storage) => {
      storage.removeItem(projectKey(id));
      writeIndexIfItFits(
        storage,
        (readIndex(storage) ?? []).filter((summary) => summary.id !== id),
      );
    });
  }

  private attempt<T>(work: (storage: Storage) => T): Promise<T> {
    try {
      return Promise.resolve(work(this.resolveStorage()));
    } catch (error: unknown) {
      return Promise.reject(asStorageError(error));
    }
  }
}

function readList(storage: Storage): readonly ProjectSummary[] {
  const actual = storedIds(storage).flatMap((id) => {
    const summary = readSummary(storage, id);
    return summary ? [summary] : [];
  });
  const indexed = readIndex(storage);
  if (!indexed || !sameSummaries(indexed, actual)) {
    writeIndexIfItFits(storage, actual);
  }
  return actual;
}

function storedIds(storage: Storage): string[] {
  const ids: string[] = [];
  for (let position = 0; position < storage.length; position++) {
    const key = storage.key(position);
    if (key?.startsWith(PROJECT_KEY_PREFIX)) {
      ids.push(key.slice(PROJECT_KEY_PREFIX.length));
    }
  }
  return ids;
}

function readIndex(storage: Storage): ProjectSummary[] | undefined {
  const text = storage.getItem(INDEX_KEY);
  const parsed = text === null ? undefined : parseJson(text);
  return Array.isArray(parsed) && parsed.every(isProjectSummary) ? parsed : undefined;
}

function readSummary(storage: Storage, id: string): ProjectSummary | undefined {
  const text = storage.getItem(projectKey(id));
  const stored = text === null ? undefined : parseJson(text);
  const project = isStoredProject(stored) ? migrateProject(stored) : undefined;
  return project && summarize(project);
}

// The index only caches what the project keys say, and list() redoes it, so an index that does not
// fit must not fail an operation whose project write already succeeded.
function writeIndexIfItFits(storage: Storage, summaries: readonly ProjectSummary[]): void {
  try {
    storage.setItem(INDEX_KEY, JSON.stringify(summaries));
  } catch (error: unknown) {
    if (!isQuotaError(error)) {
      throw error;
    }
  }
}

function projectKey(id: string): string {
  return PROJECT_KEY_PREFIX + id;
}

function sameSummaries(a: readonly ProjectSummary[], b: readonly ProjectSummary[]): boolean {
  return (
    a.length === b.length &&
    a.every((left) =>
      b.some(
        (right) =>
          right.id === left.id &&
          right.name === left.name &&
          right.mode === left.mode &&
          right.updatedAt === left.updatedAt,
      ),
    )
  );
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
