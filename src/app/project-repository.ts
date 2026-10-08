import { InjectionToken } from '@angular/core';
import type { Project, ProjectSummary, StoredProject } from '../domain';

export type StorageProblem = 'quota-exceeded' | 'unreadable' | 'unavailable';

export class ProjectStorageError extends Error {
  constructor(
    readonly reason: StorageProblem,
    options?: ErrorOptions,
  ) {
    super(`Project storage failed: ${reason}`, options);
    this.name = 'ProjectStorageError';
  }
}

/**
 * Where projects are kept (ADR-0008). `list` returns summaries in no particular order and `load`
 * returns the stored shape, which `migrateProject` turns into a `Project`. Failures reject with a
 * `ProjectStorageError`; removing a project that is already gone succeeds.
 */
export interface ProjectRepository {
  list(): Promise<readonly ProjectSummary[]>;
  load(id: string): Promise<StoredProject | undefined>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
}

export const PROJECT_REPOSITORY = new InjectionToken<ProjectRepository>('ProjectRepository');
