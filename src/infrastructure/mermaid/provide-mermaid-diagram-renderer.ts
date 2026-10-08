import type { Provider } from '@angular/core';
import { DIAGRAM_RENDERER } from '../../app/diagram-renderer';
import { MermaidDiagramRenderer } from './mermaid-diagram-renderer';

export function provideMermaidDiagramRenderer(): Provider {
  return {
    provide: DIAGRAM_RENDERER,
    useFactory: () => new MermaidDiagramRenderer(() => getComputedStyle(document.documentElement)),
  };
}
