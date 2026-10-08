import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { entityDefinitions, entityLabel } from '../../domain';
import type { Entity, EntityField, EntityKind, FieldValue, ProjectEntities, TextQuestion } from '../../domain';
import { AnswerFieldComponent } from '../answer-field/answer-field.component';

/** One field of one row, edited the way its kind of field asks: text, lines of text, or a pick of other rows. */
@Component({
  selector: 'sdc-entity-field',
  imports: [AnswerFieldComponent],
  templateUrl: './entity-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityFieldComponent {
  readonly entities = input.required<ProjectEntities>();
  readonly kind = input.required<EntityKind>();
  readonly row = input.required<Entity>();
  readonly field = input.required<EntityField>();
  readonly idBase = input.required<string>();
  readonly edited = output<FieldValue>();

  private readonly rowId = computed(() => this.row().id);
  protected readonly value = computed(() => this.row().fields[this.field().key]);

  protected readonly text = computed<TextQuestion | undefined>(() => {
    const field = this.field();
    if (field.kind === 'references') {
      return undefined;
    }
    return {
      id: `${this.idBase()}-${this.rowId()}-${field.key}`,
      prompt: field.label,
      hint: field.hint,
      kind: field.kind === 'list' ? 'string-list' : 'long-text',
    };
  });

  protected readonly picks = computed(() => {
    const field = this.field();
    if (field.kind !== 'references') {
      return undefined;
    }
    const value = this.value();
    const selected = typeof value === 'string' || value === undefined ? [] : value;
    const candidates = this.entities()[field.references].filter(
      (candidate) => field.references !== this.kind() || candidate.id !== this.rowId(),
    );
    return {
      label: field.label,
      hint: field.hint,
      emptyText: `No ${entityDefinitions[field.references].plural} listed yet.`,
      options: candidates.map((candidate) => {
        const checked = selected.includes(candidate.id);
        return {
          id: candidate.id,
          label: entityLabel(candidate, field.references),
          checked,
          toggled: candidates
            .filter((other) => (other.id === candidate.id ? !checked : selected.includes(other.id)))
            .map((other) => other.id),
        };
      }),
    };
  });
}
