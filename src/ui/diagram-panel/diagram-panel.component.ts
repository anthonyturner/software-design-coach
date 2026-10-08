import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { DIAGRAM_RENDERER } from '../../app/diagram-renderer';
import type { DiagramInteraction } from '../../app/diagram-renderer';
import { diagramDefinitions } from '../../domain';
import type { DiagramKind } from '../../domain';

/** Typing changes the diagram on every key; redrawing waits for a pause so each key does not cost a render. */
export const REDRAW_DELAY_MS = 250;

type DrawState = 'empty' | 'loading' | 'ready' | 'error';

const NO_NODES: ReadonlyMap<string, string> = new Map();

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
  /** The nodes the user can activate, by node id in the source, with the name announced for each. */
  readonly nodes = input<ReadonlyMap<string, string>>(NO_NODES);
  readonly nodeActivated = output<string>();

  protected readonly definition = computed(() => diagramDefinitions[this.kind()]);
  protected readonly state = signal<DrawState>('empty');
  protected readonly problem = signal('');
  protected readonly interactive = computed(() => this.nodes().size > 0);
  protected readonly label = computed(
    () => `${this.definition().title} diagram. Its source is listed below as text.${this.interactive() ? ' Select a node to see its details.' : ''}`,
  );

  private readonly renderer = inject(DIAGRAM_RENDERER);
  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly region = viewChild.required<ElementRef<HTMLElement>>('region');
  private lastActivated: SVGElement | undefined;
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

  /** Returns focus to the node last activated, or to the panel when a redraw has replaced that node. */
  focusLastNode(): void {
    const node = this.lastActivated;
    (node?.isConnected ? node : this.region().nativeElement).focus();
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
      await this.renderer.render(source, this.canvas().nativeElement, this.interaction());
      if (request === this.latestRequest) {
        this.lastActivated = undefined;
        this.show('ready', kind);
      }
    } catch (error: unknown) {
      if (request === this.latestRequest) {
        this.problem.set(error instanceof Error ? error.message : '');
        this.show('error', kind);
      }
    }
  }

  /** Read when the drawing is made, not tracked: the names come from the same rows as the source, so they change with it. */
  private interaction(): DiagramInteraction | undefined {
    const nodes = this.nodes();
    return nodes.size === 0
      ? undefined
      : {
          nodes,
          onActivate: (nodeId, element) => {
            this.lastActivated = element;
            this.nodeActivated.emit(nodeId);
          },
        };
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
