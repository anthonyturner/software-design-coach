import type { Routes } from '@angular/router';
import { ProjectListComponent } from '../ui/projects/project-list.component';
import { WizardComponent } from '../ui/wizard/wizard.component';

export const routes: Routes = [
  { path: '', component: ProjectListComponent },
  { path: 'projects/:id', component: WizardComponent },
  { path: '**', redirectTo: '' },
];
