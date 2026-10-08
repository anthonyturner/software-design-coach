import type { Provider } from '@angular/core';
import { PROJECT_REPOSITORY } from '../../app/project-repository';
import { LocalStorageProjectRepository } from './local-storage-project-repository';

export function provideLocalStorageProjectRepository(): Provider {
  return { provide: PROJECT_REPOSITORY, useFactory: () => new LocalStorageProjectRepository(() => localStorage) };
}
