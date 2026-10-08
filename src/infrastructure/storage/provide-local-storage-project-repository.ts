import type { Provider } from '@angular/core';
import { PROJECT_REPOSITORY } from '../../app/project-repository';
import { DeferredProjectRepository } from './deferred-project-repository';

/** The adapter is imported in the background as soon as the repository is made, which keeps the domain it needs out of the initial bundle. */
export function provideLocalStorageProjectRepository(): Provider {
  return {
    provide: PROJECT_REPOSITORY,
    useFactory: () =>
      new DeferredProjectRepository(async () => {
        const { LocalStorageProjectRepository } = await import('./local-storage-project-repository');
        return new LocalStorageProjectRepository(() => localStorage);
      }),
  };
}
