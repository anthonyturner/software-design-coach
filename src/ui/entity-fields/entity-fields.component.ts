import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { entityDefinitions, entityLabel } from '../../domain';
import type { EntityFieldsQuestion, FieldValue, ProjectEntities } from '../../domain';
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
  readonly changed = output<EntityChange>();

  protected readonly view = computed(() => {
    const question = this.question();
    const kind = question.entity;
    const definition = entityDefinitions[kind];
    const idBase = `entity-${question.id}`;
    return {
      kind,
      idBase,
      field: definition.fields.find((field) => field.key === question.field),
      promptId: `${idBase}-prompt`,
      hintId: `${idBase}-hint`,
      emptyText: `No ${definition.plural} listed yet. List them in an earlier step, then come back.`,
      rows: this.entities()[kind].map((row) => ({ entity: row, id: row.id, label: entityLabel(row, kind) })),
    };
  });

  protected edit(id: string, value: FieldValue): void {
    this.changed.emit({ type: 'edit', id, edit: { fields: { [this.question().field]: value } } });
  }
}
