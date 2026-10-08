import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { AnswerValue, ChoiceQuestion } from '../../domain';

@Component({
  selector: 'sdc-choice-field',
  templateUrl: './choice-field.component.html',
  styleUrl: './choice-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoiceFieldComponent {
  readonly question = input.required<ChoiceQuestion>();
  readonly value = input<AnswerValue | undefined>();
  readonly emptyText = input<string>();
  readonly answered = output<string>();

  protected readonly groupId = computed(() => `answer-${this.question().id}`);
  protected readonly hintId = computed(() => `${this.groupId()}-hint`);
  protected readonly emptyId = computed(() => `${this.groupId()}-empty`);
  protected readonly isEmpty = computed(() => this.question().options.length === 0 && !!this.emptyText());
  protected readonly describedBy = computed(
    () => [this.question().hint ? this.hintId() : '', this.isEmpty() ? this.emptyId() : ''].filter(Boolean).join(' ') || null,
  );
  protected readonly options = computed(() =>
    this.question().options.map((option) => ({ ...option, checked: option.value === this.value() })),
  );
}
