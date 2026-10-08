import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { StorageProblem } from '../../app/project-repository';

const MESSAGES: Readonly<Record<StorageProblem, string>> = {
  'quota-exceeded':
    'This browser has no room left to store your work, so your latest changes are not saved. ' +
    'Free some space for this site and keep this tab open.',
  unreadable: 'Something stored for this site could not be read, so it was left untouched.',
  unavailable: 'This browser is not letting Design Coach store anything, so your latest changes are not saved.',
};

@Component({
  selector: 'sdc-storage-notice',
  templateUrl: './storage-notice.component.html',
  styleUrl: './storage-notice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageNoticeComponent {
  readonly problem = input<StorageProblem | undefined>();

  protected readonly message = computed(() => {
    const problem = this.problem();
    return problem && MESSAGES[problem];
  });
}
