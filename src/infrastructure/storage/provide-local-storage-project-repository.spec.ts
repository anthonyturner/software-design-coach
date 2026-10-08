import { TestBed } from '@angular/core/testing';
import { createProject } from '../../domain';
import { PROJECT_REPOSITORY } from '../../app/project-repository';
import { provideLocalStorageProjectRepository } from './provide-local-storage-project-repository';

describe('provideLocalStorageProjectRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides a repository that saves to localStorage, even when the first call comes straight away', async () => {
    TestBed.configureTestingModule({ providers: [provideLocalStorageProjectRepository()] });
    const repository = TestBed.inject(PROJECT_REPOSITORY);

    await repository.save(createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now: '2026-10-08T09:00:00.000Z' }));

    expect((await repository.list()).map((summary) => summary.name)).toEqual(['Reminders']);
    expect(localStorage.getItem('design-coach:project:p1')).not.toBeNull();
  });
});
