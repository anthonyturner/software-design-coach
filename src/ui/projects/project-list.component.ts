import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProjectStore } from '../../app/project-store';
import { isProjectMode, PROJECT_MODES, workflowFor } from '../../domain';
import type { ChoiceQuestion, ProjectMode } from '../../domain';
import { ChoiceFieldComponent } from '../choice-field/choice-field.component';
import { StorageNoticeComponent } from '../storage-notice/storage-notice.component';

const UPDATED = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

@Component({
  selector: 'sdc-project-list',
  imports: [ChoiceFieldComponent, RouterLink, StorageNoticeComponent],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListComponent {
  protected readonly store = inject(ProjectStore);
  private readonly router = inject(Router);

  protected readonly creating = signal(false);
  protected readonly mode = signal<ProjectMode>(PROJECT_MODES[0]);
  protected readonly modeQuestion: ChoiceQuestion = {
    id: 'mode',
    kind: 'choice',
    prompt: 'What are you designing?',
    options: PROJECT_MODES.map((mode) => {
      const { title, summary } = workflowFor(mode);
      return { value: mode, label: title, detail: summary };
    }),
  };

  protected readonly rows = computed(() =>
    this.store.projects().map((project) => ({
      id: project.id,
      name: project.name,
      link: ['/projects', project.id],
      meta: `${workflowFor(project.mode).title} · updated ${UPDATED.format(new Date(project.updatedAt))}`,
    })),
  );

  constructor() {
    void this.store.refresh();
  }

  protected chooseMode(value: string): void {
    if (isProjectMode(value)) {
      this.mode.set(value);
    }
  }

  protected async create(event: Event, name: string): Promise<void> {
    event.preventDefault();
    if (this.creating()) {
      return;
    }
    this.creating.set(true);
    try {
      const id = await this.store.create(name, this.mode());
      await this.router.navigate(['/projects', id]);
    } finally {
      this.creating.set(false);
    }
  }
}
