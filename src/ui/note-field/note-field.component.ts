import { ChangeDetectionStrategy, Component, input, linkedSignal, output, untracked } from '@angular/core';

/** The collapsible notes area of a step. It shows one note, as typed, and reports each edit; where it is kept is its owner's business. */
@Component({
  selector: 'sdc-note-field',
  templateUrl: './note-field.component.html',
  styleUrl: './note-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteFieldComponent {
  /** The step the note belongs to: moving to another step is what resets whether the area is open. */
  readonly stepId = input.required<string>();
  readonly value = input.required<string>();
  readonly changed = output<string>();

  /** Open on arriving at a step that has a note, and the user's own choice from then on. */
  protected readonly expanded = linkedSignal<string, boolean>({
    source: this.stepId,
    computation: () => untracked(this.value) !== '',
  });

  // The box holds what the user typed. It follows the stored note except when that note is empty only
  // because the typed text was whitespace, so a blank typed while thinking is not wiped under the cursor.
  protected readonly text = linkedSignal<{ stepId: string; value: string }, string>({
    source: () => ({ stepId: this.stepId(), value: this.value() }),
    computation: (source, previous) =>
      previous && previous.source.stepId === source.stepId && source.value === '' && previous.value.trim() === ''
        ? previous.value
        : source.value,
  });

  protected edit(text: string): void {
    this.text.set(text);
    this.changed.emit(text);
  }

  protected toggled(event: Event): void {
    if (event.target instanceof HTMLDetailsElement) {
      this.expanded.set(event.target.open);
    }
  }
}
