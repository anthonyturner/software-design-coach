import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectStore } from '../../app/project-store';
import { adjacentSteps, openQuestions, stepAnswers } from '../../domain';
import type { AnswerValue, EntityKind } from '../../domain';
import type { EntityChange } from '../entity-list/entity-change';
import { JourneyRailComponent } from '../journey-rail/journey-rail.component';
import { StepPanelComponent } from '../step-panel/step-panel.component';
import { StorageNoticeComponent } from '../storage-notice/storage-notice.component';

@Component({
  selector: 'sdc-wizard',
  imports: [JourneyRailComponent, RouterLink, StepPanelComponent, StorageNoticeComponent],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardComponent {
  readonly id = input.required<string>();

  protected readonly store = inject(ProjectStore);

  protected readonly view = computed(() => {
    const project = this.store.project();
    const workflow = this.store.workflow();
    const step = this.store.currentStep();
    if (!project || !workflow || !step) {
      return undefined;
    }
    const { previous, next } = adjacentSteps(workflow, step.id);
    return {
      projectName: project.name,
      workflowTitle: workflow.title,
      step,
      answers: stepAnswers(project, step.id),
      entities: project.entities,
      openCount: openQuestions(project, step).length,
      stepNumber: workflow.steps.indexOf(step) + 1,
      stepCount: workflow.steps.length,
      previousId: previous?.id,
      nextId: next?.id,
    };
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        void this.store.open(id);
      });
    });
  }

  protected answer(event: { readonly questionId: string; readonly value: AnswerValue }): void {
    const step = this.view()?.step;
    if (step) {
      this.store.answer(step.id, event.questionId, event.value);
    }
  }

  protected changeEntities(event: { readonly entity: EntityKind; readonly change: EntityChange }): void {
    const { entity, change } = event;
    switch (change.type) {
      case 'add':
        this.store.addEntity(entity);
        break;
      case 'edit':
        this.store.updateEntity(entity, change.id, change.edit);
        break;
      case 'move':
        this.store.moveEntity(entity, change.id, change.offset);
        break;
      case 'remove':
        this.store.removeEntity(entity, change.id);
        break;
    }
  }

  protected goTo(stepId: string | undefined): void {
    if (stepId) {
      this.store.goTo(stepId);
    }
  }
}
