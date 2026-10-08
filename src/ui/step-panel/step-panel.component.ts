import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, untracked, viewChild } from '@angular/core';
import { entityDefinitions, entityOptions } from '../../domain';
import type {
  AnswerValue,
  ChoiceQuestion,
  EntityFieldsQuestion,
  EntityKind,
  EntityListQuestion,
  ProjectEntities,
  Step,
  StepAnswers,
  TextQuestion,
} from '../../domain';
import type { EntityChange } from '../../app/entity-change';
import { AnswerFieldComponent } from '../answer-field/answer-field.component';
import { ChoiceFieldComponent } from '../choice-field/choice-field.component';
import { EntityFieldsComponent } from '../entity-fields/entity-fields.component';
import { EntityListComponent } from '../entity-list/entity-list.component';
import { NoteFieldComponent } from '../note-field/note-field.component';

type Field =
  | { readonly type: 'entities'; readonly key: string; readonly question: EntityListQuestion }
  | {
      readonly type: 'entity-fields';
      readonly key: string;
      readonly question: EntityFieldsQuestion;
      readonly value: AnswerValue | undefined;
    }
  | {
      readonly type: 'choice';
      readonly key: string;
      readonly question: ChoiceQuestion;
      readonly value: AnswerValue | undefined;
      readonly emptyText?: string;
    }
  | { readonly type: 'text'; readonly key: string; readonly question: TextQuestion; readonly value: AnswerValue | undefined };

@Component({
  selector: 'sdc-step-panel',
  imports: [AnswerFieldComponent, ChoiceFieldComponent, EntityFieldsComponent, EntityListComponent, NoteFieldComponent],
  templateUrl: './step-panel.component.html',
  styleUrl: './step-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepPanelComponent {
  readonly step = input.required<Step>();
  readonly answers = input.required<StepAnswers>();
  readonly entities = input.required<ProjectEntities>();
  readonly note = input.required<string>();
  readonly stepNumber = input.required<number>();
  readonly stepCount = input.required<number>();
  readonly openCount = input.required<number>();
  readonly canGoBack = input.required<boolean>();
  readonly canContinue = input.required<boolean>();

  readonly noted = output<string>();
  readonly answered = output<{ readonly questionId: string; readonly value: AnswerValue }>();
  readonly entityChanged = output<{ readonly entity: EntityKind; readonly change: EntityChange }>();
  readonly back = output<void>();
  readonly next = output<void>();

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private shownStepId: string | undefined;

  protected readonly fields = computed<readonly Field[]>(() =>
    this.step().questions.map((question): Field => {
      const key = `${this.step().id}:${question.id}`;
      const value = this.answers()[question.id];
      switch (question.kind) {
        case 'entity-list':
          return { type: 'entities', key, question };
        case 'entity-fields':
          return { type: 'entity-fields', key, question, value };
        case 'entity-choice':
          return {
            type: 'choice',
            key,
            question: { ...question, kind: 'choice', options: entityOptions(this.entities(), question.entity) },
            value,
            emptyText: `No ${entityDefinitions[question.entity].plural} named yet. Name them in an earlier step, then come back.`,
          };
        case 'choice':
          return { type: 'choice', key, question, value };
        default:
          return { type: 'text', key, question, value };
      }
    }),
  );

  protected readonly status = computed(() => {
    const open = this.openCount();
    if (open === 0) {
      return 'Every required question on this step is answered.';
    }
    const noun = open === 1 ? 'question is' : 'questions are';
    return `${open} required ${noun} still open. You can continue anyway and come back to it.`;
  });

  constructor() {
    // The step changes in place, so focus moves to its heading to tell keyboard and screen-reader users.
    effect(() => {
      const id = this.step().id;
      untracked(() => {
        if (this.shownStepId !== undefined && this.shownStepId !== id) {
          this.heading().nativeElement.focus();
        }
        this.shownStepId = id;
      });
    });
  }
}
