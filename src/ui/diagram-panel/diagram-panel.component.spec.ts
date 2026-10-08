import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { DIAGRAM_RENDERER } from '../../app/diagram-renderer';
import { FakeDiagramRenderer } from '../../app/testing/fake-diagram-renderer';
import { diagramDefinitions } from '../../domain';
import type { DiagramKind } from '../../domain';
import { DiagramPanelComponent, REDRAW_DELAY_MS } from './diagram-panel.component';

describe('DiagramPanelComponent', () => {
  let renderer: FakeDiagramRenderer;
  let fixture: ComponentFixture<DiagramPanelComponent>;

  beforeEach(() => {
    renderer = new FakeDiagramRenderer();
    TestBed.configureTestingModule({ providers: [{ provide: DIAGRAM_RENDERER, useValue: renderer }] });
    fixture = TestBed.createComponent(DiagramPanelComponent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const canvas = (): HTMLElement => {
    const found = page().querySelector<HTMLElement>('.diagram__canvas');
    if (!found) {
      throw new Error('the diagram should have a canvas to draw into');
    }
    return found;
  };
  const text = (selector: string): string | undefined => page().querySelector(selector)?.textContent?.trim();

  function show(kind: DiagramKind, source: string | undefined): void {
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('source', source);
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  describe('with nothing to draw yet', () => {
    beforeEach(async () => {
      show('module', undefined);
      await settle();
    });

    it('says what to name to make the diagram appear, as a note and not as an error', () => {
      expect(text('[role="status"]')).toBe(diagramDefinitions.module.emptyText);
      expect(page().querySelector('[role="alert"]')).toBeNull();
    });

    it('draws nothing, hides the empty drawing from assistive technology and offers no source', () => {
      expect(renderer.drawings).toHaveLength(0);
      expect(canvas().hidden).toBe(true);
      expect(page().querySelector('details')).toBeNull();
    });
  });

  describe('while the diagram loads', () => {
    beforeEach(async () => {
      show('dependency', 'flowchart TB\n  n_a --> n_b');
      await settle();
    });

    it('hands the source to the renderer along with the element to draw into', () => {
      expect(renderer.drawings).toHaveLength(1);
      expect(renderer.drawings[0].source).toBe('flowchart TB\n  n_a --> n_b');
      expect(renderer.drawings[0].host).toBe(canvas());
    });

    it('says it is drawing, and keeps the empty canvas hidden', () => {
      expect(text('[role="status"]')).toBe('Drawing the diagram…');
      expect(canvas().hidden).toBe(true);
    });

    it('shows the drawing, with the loading note gone, once the renderer is done', async () => {
      renderer.drawings[0].finish();
      await settle();

      expect(canvas().hidden).toBe(false);
      expect(canvas().textContent).toBe('flowchart TB\n  n_a --> n_b');
      expect(page().querySelector('[role="status"]')).toBeNull();
    });
  });

  describe('once drawn', () => {
    beforeEach(async () => {
      show('system-context', 'flowchart LR\n  system');
      await settle();
      renderer.drawings[0].finish();
      await settle();
    });

    it('is a figure with a caption, and an image labelled with the diagram it shows', () => {
      expect(page().querySelector('figure')).not.toBeNull();
      expect(text('figcaption')).toBe(diagramDefinitions['system-context'].title);
      expect(canvas().getAttribute('aria-label')).toContain(diagramDefinitions['system-context'].title);
    });

    it('offers the diagram source as a text alternative, closed until asked for', () => {
      const details = page().querySelector('details');

      expect(details?.querySelector('summary')?.textContent?.trim()).toBe('View diagram source');
      expect(details?.open).toBe(false);
      expect(details?.querySelector('pre')?.textContent).toBe('flowchart LR\n  system');
    });

    it('keeps showing the drawing while a changed diagram is on its way, then draws the new source', async () => {
      vi.useFakeTimers();

      show('system-context', 'flowchart LR\n  system\n  other');
      await vi.advanceTimersByTimeAsync(REDRAW_DELAY_MS - 1);

      expect(renderer.drawings).toHaveLength(1);
      expect(canvas().hidden).toBe(false);

      await vi.advanceTimersByTimeAsync(1);

      expect(renderer.drawings).toHaveLength(2);
      expect(renderer.drawings[1].source).toBe('flowchart LR\n  system\n  other');
      renderer.drawings[1].finish();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(canvas().textContent).toBe('flowchart LR\n  system\n  other');
    });

    it('draws a burst of changes only once, with the last source', async () => {
      vi.useFakeTimers();

      show('system-context', 'one');
      await vi.advanceTimersByTimeAsync(REDRAW_DELAY_MS - 1);
      show('system-context', 'two');
      await vi.advanceTimersByTimeAsync(REDRAW_DELAY_MS);

      expect(renderer.drawings.map((drawing) => drawing.source)).toEqual(['flowchart LR\n  system', 'two']);
    });

    it('ignores a drawing that finishes after a newer source was asked for', async () => {
      vi.useFakeTimers();

      show('system-context', 'one');
      await vi.advanceTimersByTimeAsync(REDRAW_DELAY_MS);
      show('system-context', 'two');
      await vi.advanceTimersByTimeAsync(REDRAW_DELAY_MS);
      renderer.drawings[2].finish();
      renderer.drawings[1].fail(new Error('too late to matter'));
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(page().querySelector('[role="alert"]')).toBeNull();
      expect(canvas().hidden).toBe(false);
    });

    it('goes back to the note once the model has nothing to draw', async () => {
      show('system-context', undefined);
      await settle();

      expect(text('[role="status"]')).toBe(diagramDefinitions['system-context'].emptyText);
      expect(canvas().hidden).toBe(true);
      expect(page().querySelector('details')).toBeNull();
    });

    it('hides the old drawing at once when a different diagram is asked for, rather than show it under the wrong caption', async () => {
      show('module', 'flowchart TB\n  modules');
      await settle();

      expect(canvas().hidden).toBe(true);
      expect(text('[role="status"]')).toBe('Drawing the diagram…');
      expect(text('figcaption')).toBe(diagramDefinitions.module.title);
      expect(renderer.drawings).toHaveLength(2);
    });
  });

  describe('with nodes the user can activate', () => {
    const nodes = new Map([['n_m1', 'Scheduling']]);
    let activated: string[];

    beforeEach(async () => {
      activated = [];
      fixture.componentInstance.nodeActivated.subscribe((nodeId) => activated.push(nodeId));
      fixture.componentRef.setInput('nodes', nodes);
      show('module', 'flowchart TB\n  n_m1');
      await settle();
      renderer.drawings[0].finish();
      await settle();
    });

    function activate(): SVGElement {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      node.setAttribute('tabindex', '0');
      canvas().append(node);
      renderer.drawings[0].interaction?.onActivate('n_m1', node);
      return node;
    }

    it('asks the renderer to make those nodes operable', () => {
      expect(renderer.drawings[0].interaction?.nodes).toBe(nodes);
    });

    it('is a group of operable nodes, so assistive technology can reach them, and says to select one', () => {
      expect(canvas().getAttribute('aria-label')).toContain('Select a node');
      expect(canvas().getAttribute('role')).toBe('group');
    });

    it('reports the node the renderer says was activated', () => {
      activate();

      expect(activated).toEqual(['n_m1']);
    });

    it('returns focus to the node that was activated', () => {
      const node = activate();

      fixture.componentInstance.focusLastNode();

      expect(document.activeElement).toBe(node);
    });

    it('returns focus to the panel when a redraw has replaced the node', () => {
      activate().remove();

      fixture.componentInstance.focusLastNode();

      expect(document.activeElement).toBe(page().querySelector('section'));
    });

    it('returns focus to the panel when nothing was ever activated', () => {
      fixture.componentInstance.focusLastNode();

      expect(document.activeElement).toBe(page().querySelector('section'));
    });
  });

  describe('without nodes to activate', () => {
    beforeEach(async () => {
      show('use-case', 'flowchart LR\n  a');
      await settle();
    });

    it('asks the renderer for a plain drawing, and presents it as one image', () => {
      expect(renderer.drawings[0].interaction).toBeUndefined();
      expect(canvas().getAttribute('role')).toBe('img');
      expect(canvas().getAttribute('aria-label')).not.toContain('Select a node');
    });
  });

  describe('when the diagram cannot be drawn', () => {
    beforeEach(async () => {
      show('use-case', 'flowchart LR\n  broken');
      await settle();
      renderer.drawings[0].fail(new Error('Parse error on line 2'));
      await settle();
    });

    it('says so as an alert, reassures that the answers are safe, and gives the reason', () => {
      const alert = text('[role="alert"]');

      expect(alert).toContain('could not be drawn');
      expect(alert).toContain('Your answers are safe');
      expect(alert).toContain('Parse error on line 2');
      expect(canvas().hidden).toBe(true);
    });

    it('still offers the source, which is the text alternative', () => {
      expect(page().querySelector('details pre')?.textContent).toBe('flowchart LR\n  broken');
    });

    it('tries again when the source changes, after the same pause as any redraw', async () => {
      vi.useFakeTimers();

      show('use-case', 'flowchart LR\n  fixed');
      await vi.advanceTimersByTimeAsync(REDRAW_DELAY_MS - 1);

      expect(renderer.drawings).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(1);
      renderer.drawings[1].finish();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(page().querySelector('[role="alert"]')).toBeNull();
      expect(canvas().hidden).toBe(false);
    });

    it('keeps the error, and does not flash the loading note, while the next keystrokes settle', async () => {
      vi.useFakeTimers();

      show('use-case', 'flowchart LR\n  fixed');
      await vi.advanceTimersByTimeAsync(REDRAW_DELAY_MS - 1);
      fixture.detectChanges();

      expect(text('[role="alert"]')).toContain('could not be drawn');
      expect(page().textContent).not.toContain('Drawing the diagram');
    });

    it('explains a failure that carries no message', async () => {
      vi.useFakeTimers();

      show('use-case', 'flowchart LR\n  other');
      await vi.advanceTimersByTimeAsync(REDRAW_DELAY_MS);
      renderer.drawings[1].fail('not even an error');
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(text('[role="alert"]')).toContain('could not be drawn');
    });
  });
});
