import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideMermaidDiagramRenderer } from '../infrastructure/mermaid/provide-mermaid-diagram-renderer';
import { provideLocalStorageProjectRepository } from '../infrastructure/storage/provide-local-storage-project-repository';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideLocalStorageProjectRepository(),
    provideMermaidDiagramRenderer(),
  ],
};
