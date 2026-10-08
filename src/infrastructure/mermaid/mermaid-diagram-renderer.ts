import type mermaid from 'mermaid';
import type { DiagramRenderer } from '../../app/diagram-renderer';
import { themeVariablesFrom } from './mermaid-theme';
import type { TokenSource } from './mermaid-theme';

type Mermaid = typeof mermaid;

/**
 * The only place Mermaid is imported (ADR-0007). It is loaded with a dynamic `import()` on the first
 * drawing, so it stays out of the first bundle, and it is kept in `'strict'` mode because labels are
 * text the user typed. `tokens` is read once, when Mermaid is started. A drawing that finishes after a
 * newer one was asked for into the same host is dropped, so the host always ends on the newest.
 */
export class MermaidDiagramRenderer implements DiagramRenderer {
  private started: Promise<Mermaid> | undefined;
  private drawings = 0;
  private readonly newest = new WeakMap<HTMLElement, number>();

  constructor(private readonly tokens: () => TokenSource) {}

  async render(source: string, host: HTMLElement): Promise<void> {
    const drawing = ++this.drawings;
    this.newest.set(host, drawing);
    const library = await this.start();
    const { svg } = await library.render(`sdc-diagram-${drawing}`, source);
    if (this.newest.get(host) === drawing) {
      host.innerHTML = svg;
    }
  }

  /** A start that fails is forgotten, so the next drawing tries again instead of failing for good. */
  private start(): Promise<Mermaid> {
    this.started ??= this.load().catch((error: unknown) => {
      this.started = undefined;
      throw error;
    });
    return this.started;
  }

  private async load(): Promise<Mermaid> {
    const { default: library } = await import('mermaid');
    library.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: themeVariablesFrom(this.tokens()),
    });
    return library;
  }
}
