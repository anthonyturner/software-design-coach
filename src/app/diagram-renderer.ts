import { InjectionToken } from '@angular/core';

/**
 * Draws Mermaid source into an element (ADR-0005, ADR-0007). The returned promise resolves once the
 * host shows the drawing, and rejects if the source cannot be drawn or the renderer cannot be
 * loaded; a rejection leaves what the host showed before untouched. A drawing superseded by a newer
 * one into the same host resolves without writing, so the host always ends on the newest.
 */
export interface DiagramRenderer {
  render(source: string, host: HTMLElement): Promise<void>;
}

export const DIAGRAM_RENDERER = new InjectionToken<DiagramRenderer>('DiagramRenderer');
