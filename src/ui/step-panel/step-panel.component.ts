import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  untracked,
  viewChild,
} from '@angular/core';
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
  private readonly question = viewChild.required<ElementRef<HTMLElement>>('question');
  private readonly injector = inject(Injector);
  private shown: { readonly stepId: string; readonly index: number } | undefined;

  /** Which question of the step is on screen; opening any step, by Continue, Back or the journey rail, starts at its first. */
  private readonly questionIndex = linkedSignal<string, number>({ source: () => this.step().id, computation: () => 0 });

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

  protected readonly current = computed(() => {
    const fields = this.fields();
    const index = Math.min(this.questionIndex(), fields.length - 1);
    const field = fields[index];
    const position = fields.length > 1 ? `Question ${index + 1} of ${fields.length}` : undefined;
    const optional = field.question.optional === true;
    return {
      field,
      position,
      optional,
      label: [position, field.question.prompt, optional ? 'optional' : undefined].filter(Boolean).join(', '),
      hasPrevious: index > 0,
      hasNext: index < fields.length - 1,
    };
  });

  /** The one field on screen, as a list so the field is rebuilt for each question rather than reused with new inputs. */
  protected readonly shownFields = computed(() => [this.current().field]);

  protected readonly status = computed(() => {
    const open = this.openCount();
    if (open === 0) {
      return 'Every required question on this step is answered.';
    }
    const noun = open === 1 ? 'question is' : 'questions are';
    return `${open} required ${noun} still open. You can continue anyway and come back to it.`;
  });

  constructor() {
    // The step and the question change in place, so focus moves to the step heading or to the question, to tell keyboard and screen-reader users.
    effect(() => {
      const stepId = this.step().id;
      const index = this.questionIndex();
      untracked(() => {
        const before = this.shown;
        if (before && before.stepId !== stepId) {
          this.heading().nativeElement.focus();
        } else if (before && before.index !== index) {
          // After the render, so the group is announced with the new question's label rather than the old one.
          afterNextRender(() => this.question().nativeElement.focus(), { injector: this.injector });
        }
        this.shown = { stepId, index };
      });
    });
  }

  protected goBack(): void {
    if (this.current().hasPrevious) {
      this.questionIndex.update((index) => index - 1);
    } else {
      this.back.emit();
    }
  }

  protected goForward(): void {
    if (this.current().hasNext) {
      this.questionIndex.update((index) => index + 1);
    } else {
      this.next.emit();
    }
  }
}
