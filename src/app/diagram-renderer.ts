import { InjectionToken } from '@angular/core';

/**
 * Nodes of a drawing the user can activate, with a click or the keyboard. Only the nodes named here
 * are made operable; any other node stays plain.
 */
export interface DiagramInteraction {
  /** Each activatable node's id in the source, with the name a screen reader announces for it. */
  readonly nodes: ReadonlyMap<string, string>;
  /** Called with the node's id and the element that was activated, so the caller can return focus to it. */
  readonly onActivate: (nodeId: string, element: SVGElement) => void;
}

/**
 * Draws Mermaid source into an element (ADR-0005, ADR-0007). The returned promise resolves once the
 * host shows the drawing, and rejects if the source cannot be drawn or the renderer cannot be
 * loaded; a rejection leaves what the host showed before untouched. A drawing superseded by a newer
 * one into the same host resolves without writing, so the host always ends on the newest.
 *
 * With an `interaction`, the drawn nodes it names can be focused and activated, and a superseded
 * drawing is not wired, so only what the host shows can call back.
 */
export interface DiagramRenderer {
  render(source: string, host: HTMLElement, interaction?: DiagramInteraction): Promise<void>;
}

export const DIAGRAM_RENDERER = new InjectionToken<DiagramRenderer>('DiagramRenderer');
