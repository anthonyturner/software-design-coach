import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import type { AnswerValue, TextQuestion } from '../../domain';
import { answerFromText, textOfAnswer } from './answer-text';

@Component({
  selector: 'sdc-answer-field',
  templateUrl: './answer-field.component.html',
  styleUrl: './answer-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerFieldComponent {
  readonly question = input.required<TextQuestion>();
  readonly value = input<AnswerValue | undefined>();
  readonly answered = output<AnswerValue>();

  protected readonly fieldId = computed(() => `answer-${this.question().id}`);
  protected readonly hintId = computed(() => `${this.fieldId()}-hint`);
  protected readonly describedBy = computed(() => (this.question().hint ? this.hintId() : null));

  // The draft is the text in the box. It follows the stored answer only when that answer was not
  // produced by the draft itself, so typing a blank line is not tidied away under the cursor.
  protected readonly text = linkedSignal<{ question: TextQuestion; value: AnswerValue | undefined }, string>({
    source: () => ({ question: this.question(), value: this.value() }),
    computation: ({ question, value }, previous) =>
      previous && textOfAnswer(answerFromText(question.kind, previous.value)) === textOfAnswer(value)
        ? previous.value
        : textOfAnswer(value),
  });

  protected edit(text: string): void {
    this.text.set(text);
    this.answered.emit(answerFromText(this.question().kind, text));
  }
}
