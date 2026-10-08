import { answer, createProject, isStoredProject, migrateProject, SCHEMA_VERSION } from '../../domain';
import type { Project } from '../../domain';
import { ProjectStorageError } from '../../app/project-repository';
import { LocalStorageProjectRepository } from './local-storage-project-repository';

const INDEX_KEY = 'design-coach:index';
const projectKey = (id: string): string => `design-coach:project:${id}`;

function project(id: string, name = id, now = '2026-10-08T09:00:00.000Z'): Project {
  return createProject({ id, name, mode: 'new-project', now });
}

/** localStorage that fails writes to chosen keys, the way a full browser does. */
class FailingStorage implements Storage {
  failWritesTo: (key: string) => boolean = () => false;
  failure: unknown = new DOMException('The quota has been exceeded.', 'QuotaExceededError');

  get length(): number {
    return localStorage.length;
  }
  clear(): void {
    localStorage.clear();
  }
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }
  key(index: number): string | null {
    return localStorage.key(index);
  }
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
  setItem(key: string, value: string): void {
    if (this.failWritesTo(key)) {
      throw this.failure;
    }
    localStorage.setItem(key, value);
  }
}

async function names(repository: LocalStorageProjectRepository): Promise<string[]> {
  return (await repository.list()).map((summary) => summary.name).sort();
}

describe('LocalStorageProjectRepository', () => {
  let repository: LocalStorageProjectRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageProjectRepository(localStorage);
  });

  describe('round trip', () => {
    it('gives back what was saved, once migrated', async () => {
      const saved = answer(project('p1', 'Reminders'), 'users', 'users', ['receptionist', 'patient'], '2026-10-08T09:01:00.000Z');

      await repository.save(saved);
      const stored = await repository.load('p1');

      expect(stored && migrateProject(stored)).toEqual(saved);
    });

    it('writes the schema version into every saved project', async () => {
      await repository.save(project('p1'));

      const raw: unknown = JSON.parse(localStorage.getItem(projectKey('p1')) ?? 'null');
      expect(isStoredProject(raw) && raw.schemaVersion).toBe(SCHEMA_VERSION);
    });

    it('lists what was saved, and a re-save replaces rather than duplicates', async () => {
      await repository.save(project('p1', 'Old name'));
      await repository.save(project('p1', 'New name'));
      await repository.save(project('p2', 'Other'));

      expect(await names(repository)).toEqual(['New name', 'Other']);
    });

    it('survives a new repository over the same storage, which is what a reload is', async () => {
      await repository.save(project('p1', 'Reminders'));

      const afterReload = new LocalStorageProjectRepository(localStorage);

      expect(await names(afterReload)).toEqual(['Reminders']);
      expect(await afterReload.load('p1')).toBeDefined();
    });
  });

  describe('load', () => {
    it('finds nothing for an id it does not hold', async () => {
      expect(await repository.load('missing')).toBeUndefined();
    });

    it('rejects, rather than guessing, when stored text is not a project', async () => {
      localStorage.setItem(projectKey('p1'), '{not json');

      await expect(repository.load('p1')).rejects.toMatchObject({ reason: 'unreadable' });
    });
  });

  describe('remove', () => {
    it('forgets the project and its place in the list', async () => {
      await repository.save(project('p1'));
      await repository.save(project('p2'));

      await repository.remove('p1');

      expect(await repository.load('p1')).toBeUndefined();
      expect(await names(repository)).toEqual(['p2']);
    });

    it('succeeds for a project that is already gone', async () => {
      await expect(repository.remove('missing')).resolves.toBeUndefined();
    });
  });

  describe('keeping the index in step with the projects', () => {
    it('writes the project before the index', async () => {
      const writes: string[] = [];
      const storage = new FailingStorage();
      storage.failWritesTo = (key) => {
        writes.push(key);
        return false;
      };

      await new LocalStorageProjectRepository(storage).save(project('p1'));

      expect(writes).toEqual([projectKey('p1'), INDEX_KEY]);
    });

    it('rebuilds a missing index from the stored projects and writes it back', async () => {
      await repository.save(project('p1', 'One'));
      await repository.save(project('p2', 'Two'));
      localStorage.removeItem(INDEX_KEY);

      expect(await names(repository)).toEqual(['One', 'Two']);
      expect(localStorage.getItem(INDEX_KEY)).not.toBeNull();
    });

    it('lists a project whose index write failed, and repairs the index', async () => {
      await repository.save(project('p1', 'One'));
      const storage = new FailingStorage();
      storage.failWritesTo = (key) => key === INDEX_KEY;

      await expect(new LocalStorageProjectRepository(storage).save(project('p2', 'Two'))).rejects.toMatchObject({
        reason: 'quota-exceeded',
      });

      expect(await names(repository)).toEqual(['One', 'Two']);
      const index: unknown = JSON.parse(localStorage.getItem(INDEX_KEY) ?? 'null');
      expect(index).toHaveLength(2);
    });

    it('drops an index entry whose project is gone', async () => {
      await repository.save(project('p1', 'One'));
      await repository.save(project('p2', 'Two'));
      localStorage.removeItem(projectKey('p2'));

      expect(await names(repository)).toEqual(['One']);
    });

    it('replaces an index that is not valid', async () => {
      await repository.save(project('p1', 'One'));
      localStorage.setItem(INDEX_KEY, '{not json');

      expect(await names(repository)).toEqual(['One']);
      expect(JSON.parse(localStorage.getItem(INDEX_KEY) ?? 'null')).toHaveLength(1);
    });

    it('leaves out a stored project it cannot read, without touching it', async () => {
      await repository.save(project('p1', 'One'));
      localStorage.setItem(projectKey('broken'), '{not json');
      localStorage.removeItem(INDEX_KEY);

      expect(await names(repository)).toEqual(['One']);
      expect(localStorage.getItem(projectKey('broken'))).toBe('{not json');
    });

    it('still lists the projects when the repair itself cannot be saved', async () => {
      await repository.save(project('p1', 'One'));
      localStorage.removeItem(INDEX_KEY);
      const storage = new FailingStorage();
      storage.failWritesTo = () => true;

      expect(await names(new LocalStorageProjectRepository(storage))).toEqual(['One']);
    });

    it('ignores keys that belong to something else', async () => {
      localStorage.setItem('someone-else:project:p9', '{}');
      await repository.save(project('p1', 'One'));

      expect(await names(repository)).toEqual(['One']);
    });
  });

  describe('when storage fails', () => {
    it('rejects a save into a full browser as quota-exceeded, not as silence', async () => {
      const storage = new FailingStorage();
      storage.failWritesTo = () => true;

      const saving = new LocalStorageProjectRepository(storage).save(project('p1'));

      await expect(saving).rejects.toBeInstanceOf(ProjectStorageError);
      await expect(saving).rejects.toMatchObject({ reason: 'quota-exceeded' });
    });

    it('rejects as unavailable when the browser refuses storage access', async () => {
      const storage = new FailingStorage();
      storage.failWritesTo = () => true;
      storage.failure = new DOMException('Access is denied.', 'SecurityError');

      await expect(new LocalStorageProjectRepository(storage).save(project('p1'))).rejects.toMatchObject({
        reason: 'unavailable',
      });
    });
  });
});
