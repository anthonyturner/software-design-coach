import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import type { AnswerValue, Step, StepAnswers } from '../../domain';
import { AnswerFieldComponent } from '../answer-field/answer-field.component';

@Component({
  selector: 'sdc-step-panel',
  imports: [AnswerFieldComponent],
  templateUrl: './step-panel.component.html',
  styleUrl: './step-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepPanelComponent {
  readonly step = input.required<Step>();
  readonly answers = input.required<StepAnswers>();
  readonly stepNumber = input.required<number>();
  readonly stepCount = input.required<number>();
  readonly canGoBack = input.required<boolean>();
  readonly canContinue = input.required<boolean>();

  readonly answered = output<{ readonly questionId: string; readonly value: AnswerValue }>();
  readonly back = output<void>();
  readonly next = output<void>();

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  protected readonly fields = computed(() =>
    this.step().questions.map((question) => ({
      key: `${this.step().id}:${question.id}`,
      question,
      value: this.answers()[question.id],
    })),
  );

  // The step changes in place, so focus moves to its heading to tell keyboard and screen-reader users.
  protected goBack(): void {
    this.back.emit();
    this.heading().nativeElement.focus();
  }

  protected goNext(): void {
    this.next.emit();
    this.heading().nativeElement.focus();
  }
}
