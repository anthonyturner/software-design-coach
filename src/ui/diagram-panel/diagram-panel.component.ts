import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { DIAGRAM_RENDERER } from '../../app/diagram-renderer';
import { diagramDefinitions } from '../../domain';
import type { DiagramKind } from '../../domain';

/** Typing changes the diagram on every key; redrawing waits for a pause so each key does not cost a render. */
export const REDRAW_DELAY_MS = 250;

type DrawState = 'empty' | 'loading' | 'ready' | 'error';

/** The VISUALIZE column: shows one diagram's source drawn by the renderer, and what the user needs to know while it is not drawn. */
@Component({
  selector: 'sdc-diagram-panel',
  templateUrl: './diagram-panel.component.html',
  styleUrl: './diagram-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagramPanelComponent {
  readonly kind = input.required<DiagramKind>();
  /** The Mermaid source, or `undefined` while the model has nothing to draw. */
  readonly source = input.required<string | undefined>();

  protected readonly definition = computed(() => diagramDefinitions[this.kind()]);
  protected readonly state = signal<DrawState>('empty');
  protected readonly problem = signal('');

  private readonly renderer = inject(DIAGRAM_RENDERER);
  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private settledKind: DiagramKind | undefined;
  private latestRequest = 0;

  constructor() {
    effect((onCleanup) => {
      const kind = this.kind();
      const source = this.source();
      const timer = untracked(() => this.plan(kind, source));
      onCleanup(() => clearTimeout(timer));
    });
  }

  /** Decides what the panel shows now, and schedules the drawing; returns the timer so a newer source can cancel it. */
  private plan(kind: DiagramKind, source: string | undefined): ReturnType<typeof setTimeout> | undefined {
    const request = ++this.latestRequest;
    if (source === undefined) {
      this.show('empty');
      return undefined;
    }
    const redrawing = this.settledKind === kind;
    if (!redrawing) {
      this.show('loading');
    }
    return setTimeout(() => void this.draw(kind, source, request), redrawing ? REDRAW_DELAY_MS : 0);
  }

  private async draw(kind: DiagramKind, source: string, request: number): Promise<void> {
    try {
      await this.renderer.render(source, this.canvas().nativeElement);
      if (request === this.latestRequest) {
        this.show('ready', kind);
      }
    } catch (error: unknown) {
      if (request === this.latestRequest) {
        this.problem.set(error instanceof Error ? error.message : '');
        this.show('error', kind);
      }
    }
  }

  /**
   * `settled` is the diagram the panel has an outcome for, drawn or failed: a change to the same one
   * waits out the redraw pause and keeps showing that outcome, instead of flashing the loading note.
   */
  private show(state: DrawState, settled?: DiagramKind): void {
    this.settledKind = settled;
    this.state.set(state);
  }
}
