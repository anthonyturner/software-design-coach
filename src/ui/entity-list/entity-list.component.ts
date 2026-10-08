import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from '@angular/core';
import { entityDefinitions, entityLabel } from '../../domain';
import type { EntityListQuestion, FieldValue, ProjectEntities } from '../../domain';
import type { EntityChange } from '../../app/entity-change';
import { EntityFieldComponent } from '../entity-field/entity-field.component';

@Component({
  selector: 'sdc-entity-list',
  imports: [EntityFieldComponent],
  templateUrl: './entity-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityListComponent {
  readonly question = input.required<EntityListQuestion>();
  readonly entities = input.required<ProjectEntities>();
  readonly changed = output<EntityChange>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly list = computed(() => {
    const question = this.question();
    const kind = question.entity;
    const definition = entityDefinitions[kind];
    const rows = this.entities()[kind];
    const idBase = `entity-${question.id}`;
    const singular = definition.singular.charAt(0).toUpperCase() + definition.singular.slice(1);

    return {
      kind,
      idBase,
      promptId: `${idBase}-prompt`,
      hintId: `${idBase}-hint`,
      emptyText: `No ${definition.plural} yet.`,
      addLabel: `Add ${definition.singular}`,
      fields: definition.fields.filter((field) => question.fields?.includes(field.key) ?? true),
      rows: rows.map((row, index) => {
        const label = entityLabel(row, kind);
        return {
          entity: row,
          id: row.id,
          legend: `${singular} ${index + 1}`,
          name: row.name,
          nameLabel: definition.nameLabel,
          nameId: `${idBase}-${row.id}-name`,
          canMoveUp: index > 0,
          canMoveDown: index < rows.length - 1,
          moveUpLabel: `Move ${label} up`,
          moveDownLabel: `Move ${label} down`,
          removeLabel: `Remove ${label}`,
        };
      }),
    };
  });

  protected add(): void {
    this.changed.emit({ type: 'add' });
    this.focusAfterRender(() => [this.lastNameKey()]);
  }

  protected editName(id: string, name: string): void {
    this.changed.emit({ type: 'edit', id, edit: { name } });
  }

  protected editField(id: string, key: string, value: FieldValue): void {
    this.changed.emit({ type: 'edit', id, edit: { fields: { [key]: value } } });
  }

  // A moved row is re-inserted into the page, which drops focus, so the button the user was on is
  // refocused; at either end that button is disabled, so the opposite one takes the focus.
  protected move(id: string, offset: -1 | 1): void {
    this.changed.emit({ type: 'move', id, offset });
    const [same, other] = offset < 0 ? ['up', 'down'] : ['down', 'up'];
    this.focusAfterRender(() => [`${same}:${id}`, `${other}:${id}`]);
  }

  protected remove(id: string): void {
    const rows = this.list().rows;
    const index = rows.findIndex((row) => row.id === id);
    const neighbour = rows[index + 1] ?? rows[index - 1];
    this.changed.emit({ type: 'remove', id });
    this.focusAfterRender(() => [neighbour ? `name:${neighbour.id}` : 'add']);
  }

  private lastNameKey(): string {
    const names = this.host.nativeElement.querySelectorAll<HTMLElement>('[data-focus^="name:"]');
    return names.item(names.length - 1)?.dataset['focus'] ?? 'add';
  }

  private focusAfterRender(candidates: () => readonly string[]): void {
    afterNextRender(
      () => {
        const targets = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[data-focus]'));
        for (const key of candidates()) {
          const target = targets.find((element) => element.dataset['focus'] === key);
          if (target && !(target instanceof HTMLButtonElement && target.disabled)) {
            target.focus();
            return;
          }
        }
      },
      { injector: this.injector },
    );
  }
}
