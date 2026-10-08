import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { LocalStorageProjectRepository } from '../infrastructure/storage/local-storage-project-repository';
import { routes } from './app.routes';
import { PROJECT_REPOSITORY } from './project-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: PROJECT_REPOSITORY, useFactory: () => new LocalStorageProjectRepository(localStorage) },
  ],
};
