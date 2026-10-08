import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectStore } from '../../app/project-store';
import { summaryOf } from '../../domain';
import { DiagramPanelComponent } from '../diagram-panel/diagram-panel.component';
import { ExportMenuComponent } from '../export-menu/export-menu.component';
import { OpenStateMessageComponent } from '../open-state-message/open-state-message.component';
import { StorageNoticeComponent } from '../storage-notice/storage-notice.component';
import { SummaryValueComponent } from '../summary-value/summary-value.component';

/** The whole design on one page, derived from the open project and read-only, laid out to be printed or exported (ADR-0004). */
@Component({
  selector: 'sdc-summary',
  imports: [
    DiagramPanelComponent,
    ExportMenuComponent,
    OpenStateMessageComponent,
    RouterLink,
    StorageNoticeComponent,
    SummaryValueComponent,
  ],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryComponent {
  readonly id = input.required<string>();

  protected readonly store = inject(ProjectStore);
  private readonly page = inject(DOCUMENT).defaultView;

  protected readonly summary = computed(() => {
    const project = this.store.project();
    return project && summaryOf(project);
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        void this.store.open(id);
      });
    });
  }

  protected print(): void {
    this.page?.print();
  }
}
