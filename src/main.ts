import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { ShellComponent } from './ui/shell/shell.component';

bootstrapApplication(ShellComponent, appConfig).catch((err: unknown) => {
  document.body.textContent = 'Design Coach could not start. Reload the page to try again.';
  throw err;
});
