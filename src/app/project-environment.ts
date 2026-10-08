import { InjectionToken } from '@angular/core';

export const PROJECT_CLOCK = new InjectionToken<() => string>('PROJECT_CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date().toISOString(),
});

export const PROJECT_ID_GENERATOR = new InjectionToken<() => string>('PROJECT_ID_GENERATOR', {
  providedIn: 'root',
  factory: () => () => crypto.randomUUID(),
});
