import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../ui/projects/project-list.component').then((module) => module.ProjectListComponent),
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('../ui/wizard/wizard.component').then((module) => module.WizardComponent),
  },
  { path: '**', redirectTo: '' },
];
