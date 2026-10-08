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

  protected toggled(event: Event): void {
    if (event.target instanceof HTMLDetailsElement) {
      this.expanded.set(event.target.open);
    }
  }
}
