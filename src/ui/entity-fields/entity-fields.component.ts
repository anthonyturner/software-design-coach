import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { entityDefinitions, entityLabel, hasFieldContent, NONE_ANSWER } from '../../domain';
import type { AnswerValue, EntityFieldsQuestion, FieldValue, ProjectEntities } from '../../domain';
import type { EntityChange } from '../../app/entity-change';
import { EntityFieldComponent } from '../entity-field/entity-field.component';

/** One field of every row already listed, edited row by row; the rows themselves are added elsewhere. */
@Component({
  selector: 'sdc-entity-fields',
  imports: [EntityFieldComponent],
  templateUrl: './entity-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityFieldsComponent {
  readonly question = input.required<EntityFieldsQuestion>();
  readonly entities = input.required<ProjectEntities>();
  readonly answer = input<AnswerValue | undefined>();
  readonly changed = output<EntityChange>();
  readonly answered = output<AnswerValue>();

  protected readonly view = computed(() => {
    const question = this.question();
    const kind = question.entity;
    const definition = entityDefinitions[kind];
    const idBase = `entity-${question.id}`;
    const rows = this.entities()[kind];
    const field = definition.fields.find((found) => found.key === question.field);
    return {
      kind,
      idBase,
      // The question's own hint sits once above the rows, so the field's is not repeated inside each.
      field: field && { ...field, hint: undefined },
      promptId: `${idBase}-prompt`,
      hintId: `${idBase}-hint`,
      emptyText: `No ${definition.plural} listed yet. List them in an earlier step, then come back.`,
      rows: rows.map((row) => ({ entity: row, id: row.id, label: entityLabel(row, kind) })),
      none: question.noneLabel && {
        label: question.noneLabel,
        checked: this.answer() === NONE_ANSWER,
        disabled: hasFieldContent(this.entities(), kind, question.field),
      },
    };
  });

  protected edit(id: string, value: FieldValue): void {
    this.changed.emit({ type: 'edit', id, edit: { fields: { [this.question().field]: value } } });
  }

  protected say(none: boolean): void {
    this.answered.emit(none ? NONE_ANSWER : '');
  }
}
