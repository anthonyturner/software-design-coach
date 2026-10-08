import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, input, output, untracked, viewChild } from '@angular/core';
import type { ModuleDetails } from '../../domain';

/**
 * The details of one module, read-only, beside the diagram that opened it. It is a dialog that does
 * not hold the page: focus moves in when it opens and when it is asked to show another module, Tab
 * leaves it like any other part of the page, and Close hands the decision to its owner, who also
 * decides where focus goes next and which Escape presses mean "close".
 */
@Component({
  selector: 'sdc-module-drawer',
  templateUrl: './module-drawer.component.html',
  styleUrl: './module-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleDrawerComponent {
  readonly module = input.required<ModuleDetails>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly moduleId = computed(() => this.module().id);

  constructor() {
    afterRenderEffect(() => {
      this.moduleId();
      untracked(() => this.dialog().nativeElement.focus());
    });
  }
}
