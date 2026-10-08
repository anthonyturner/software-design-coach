import type { DiagramRenderer } from '../diagram-renderer';

export interface PendingDrawing {
  readonly source: string;
  readonly host: HTMLElement;
  /** Finishes the drawing, leaving the source as the host's text so a test can see what was drawn. */
  readonly finish: () => void;
  readonly fail: (reason: unknown) => void;
}

/** Holds every drawing open until the test finishes or fails it, so loading and error states can be observed. */
export class FakeDiagramRenderer implements DiagramRenderer {
  readonly drawings: PendingDrawing[] = [];

  render(source: string, host: HTMLElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.drawings.push({
        source,
        host,
        finish: () => {
          host.textContent = source;
          resolve();
        },
        fail: reject,
      });
    });
  }
}
