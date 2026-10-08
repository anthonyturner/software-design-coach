import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OpenState } from '../../app/project-store';

const MESSAGES: Readonly<Record<Exclude<OpenState, 'open'>, string>> = {
  none: 'Opening your project…',
  loading: 'Opening your project…',
  'not-found':
    'This project is not in this browser. Projects live in the browser that created them, so it may have been ' +
    'cleared or made somewhere else.',
  unreadable:
    'This project could not be opened. It may have been saved by a newer version of Design Coach, and it has ' +
    'been left untouched.',
};

/** What a page that shows one project says while the project is not open, or cannot be. It says nothing once it is open. */
@Component({
  selector: 'sdc-open-state-message',
  templateUrl: './open-state-message.component.html',
  styleUrl: './open-state-message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenStateMessageComponent {
  readonly state = input.required<OpenState>();

  protected readonly message = computed(() => {
    const state = this.state();
    return state === 'open' ? undefined : MESSAGES[state];
  });
}
