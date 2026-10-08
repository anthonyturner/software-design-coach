import { MermaidDiagramRenderer } from './mermaid-diagram-renderer';

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));

// Mermaid needs real SVG layout, which jsdom cannot do (ADR-0007), so the library is replaced by a double here.
vi.mock('mermaid', () => ({ default: mermaid }));

const tokens: Readonly<Record<string, string>> = {
  '--sdc-color-text': ' #e6e9ef ',
  '--sdc-color-accent': '#5fd4c3',
  '--sdc-font-sans': 'system-ui, sans-serif',
};

const style = { getPropertyValue: (name: string): string => tokens[name] ?? '' };

describe('MermaidDiagramRenderer', () => {
  let renderer: MermaidDiagramRenderer;
  let host: HTMLElement;

  beforeEach(() => {
    mermaid.initialize.mockReset();
    mermaid.render.mockReset();
    mermaid.render.mockImplementation((id: string) => Promise.resolve({ svg: `<svg id="${id}"></svg>` }));
    renderer = new MermaidDiagramRenderer(() => style);
    host = document.createElement('div');
  });

  it('does not load Mermaid until something is drawn', () => {
    expect(mermaid.initialize).not.toHaveBeenCalled();
  });

  it('draws the source it is given into the host', async () => {
    await renderer.render('flowchart LR\n  a --> b', host);

    expect(mermaid.render).toHaveBeenCalledWith(expect.any(String), 'flowchart LR\n  a --> b');
    expect(host.querySelector('svg')).not.toBeNull();
  });

  it('starts Mermaid once, in strict mode, without scanning the page', async () => {
    await renderer.render('flowchart LR\n  a --> b', host);
    await renderer.render('flowchart LR\n  c --> d', host);

    expect(mermaid.initialize).toHaveBeenCalledTimes(1);
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true }),
    );
  });

  it('themes the drawing from the design tokens, leaving out the ones the page does not define', async () => {
    await renderer.render('flowchart LR\n  a --> b', host);

    const config = mermaid.initialize.mock.calls[0][0] as { theme: string; themeVariables: Record<string, unknown> };
    expect(config.theme).toBe('base');
    expect(config.themeVariables).toMatchObject({
      darkMode: true,
      primaryTextColor: '#e6e9ef',
      primaryBorderColor: '#5fd4c3',
      fontFamily: 'system-ui, sans-serif',
    });
    expect(config.themeVariables).not.toHaveProperty('lineColor');
  });

  it('gives each drawing an id of its own, since Mermaid builds the drawing under that id', async () => {
    await renderer.render('flowchart LR\n  a --> b', host);
    await renderer.render('flowchart LR\n  c --> d', host);

    const ids = mermaid.render.mock.calls.map((call) => call[0] as string);
    expect(new Set(ids).size).toBe(2);
  });

  it('replaces what the host showed with the new drawing', async () => {
    host.innerHTML = '<svg id="old"></svg>';

    await renderer.render('flowchart LR\n  a --> b', host);

    expect(host.querySelectorAll('svg')).toHaveLength(1);
    expect(host.querySelector('#old')).toBeNull();
  });

  it('keeps only the newest drawing for a host, even when an older one finishes late', async () => {
    let finishOlder: (drawing: { svg: string }) => void = () => undefined;
    mermaid.render.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOlder = resolve;
        }),
    );
    const older = renderer.render('flowchart LR\n  a --> b', host);
    await vi.waitFor(() => expect(mermaid.render).toHaveBeenCalledTimes(1));

    await renderer.render('flowchart LR\n  c --> d', host);
    finishOlder({ svg: '<svg id="older"></svg>' });
    await older;

    expect(host.querySelector('#older')).toBeNull();
    expect(host.querySelector('#sdc-diagram-2')).not.toBeNull();
  });

  it('draws into two hosts independently', async () => {
    const other = document.createElement('div');

    await renderer.render('flowchart LR\n  a --> b', host);
    await renderer.render('flowchart LR\n  c --> d', other);

    expect(host.querySelector('svg')).not.toBeNull();
    expect(other.querySelector('svg')).not.toBeNull();
  });

  it('rejects, and leaves the host as it was, when Mermaid cannot draw the source', async () => {
    host.innerHTML = '<svg id="old"></svg>';
    mermaid.render.mockRejectedValueOnce(new Error('Parse error on line 2'));

    await expect(renderer.render('not a diagram', host)).rejects.toThrow('Parse error on line 2');

    expect(host.querySelector('#old')).not.toBeNull();
  });

  it('tries to start Mermaid again on the next drawing after a start that failed', async () => {
    mermaid.initialize.mockImplementationOnce(() => {
      throw new Error('could not start');
    });

    await expect(renderer.render('flowchart LR\n  a --> b', host)).rejects.toThrow('could not start');
    await renderer.render('flowchart LR\n  a --> b', host);

    expect(mermaid.initialize).toHaveBeenCalledTimes(2);
    expect(host.querySelector('svg')).not.toBeNull();
  });

  describe('with nodes the user can activate', () => {
    type Node = readonly [nodeId: string, label: string];

    /** Markup shaped like what Mermaid 12 draws: a node group's id is the drawing's id, then `flowchart`, the node id and a counter. */
    function flowchart(id: string, ...nodes: readonly Node[]): string {
      const groups = nodes
        .map(
          ([nodeId, label], index) =>
            `<g class="node default" id="${id}-flowchart-${nodeId}-${index}"><rect></rect><g class="label"><text>${label}</text></g></g>`,
        )
        .join('');
      return `<svg id="${id}"><g class="clusters"><g class="cluster" id="${id}-system"></g></g><g class="nodes">${groups}</g></svg>`;
    }

    function drawing(...nodes: readonly Node[]): void {
      mermaid.render.mockImplementation((id: string) => Promise.resolve({ svg: flowchart(id, ...nodes) }));
    }

    const names = new Map([
      ['n_m1', 'Scheduling'],
      ['n_m-2', 'Notifier'],
    ]);

    function nodeOf(nodeId: string): SVGElement {
      const found = [...host.querySelectorAll<SVGElement>('g.node')].find((group) => group.id.includes(`flowchart-${nodeId}-`));
      if (!found) {
        throw new Error(`no node ${nodeId}`);
      }
      return found;
    }

    it('makes each named node a focusable button announced by its name, with a pointer cursor', async () => {
      drawing(['n_m1', 'Scheduling<br/>Owns times'], ['n_m-2', 'Notifier']);

      await renderer.render('flowchart TB', host, { nodes: names, onActivate: vi.fn() });

      for (const [nodeId, name] of names) {
        const node = nodeOf(nodeId);
        expect(node.getAttribute('tabindex'), nodeId).toBe('0');
        expect(node.getAttribute('role'), nodeId).toBe('button');
        expect(node.getAttribute('aria-label'), nodeId).toBe(name);
        expect(node.style.cursor, nodeId).toBe('pointer');
      }
    });

    it('leaves a node it was not told about, and a subgraph, as they were', async () => {
      drawing(['n_m1', 'Scheduling'], ['n_other', 'Other']);

      await renderer.render('flowchart TB', host, { nodes: names, onActivate: vi.fn() });

      expect(nodeOf('n_other').hasAttribute('tabindex')).toBe(false);
      expect(host.querySelector('.cluster')?.hasAttribute('tabindex')).toBe(false);
    });

    it('reports the node id and the element on a click', async () => {
      drawing(['n_m1', 'Scheduling'], ['n_m-2', 'Notifier']);
      const onActivate = vi.fn();
      await renderer.render('flowchart TB', host, { nodes: names, onActivate });

      nodeOf('n_m-2').dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onActivate).toHaveBeenCalledExactlyOnceWith('n_m-2', nodeOf('n_m-2'));
    });

    it('finds a node whose id ends in a number, since only the last number is the counter', async () => {
      drawing(['n_a-1-2', 'Odd']);
      const onActivate = vi.fn();
      await renderer.render('flowchart TB', host, { nodes: new Map([['n_a-1-2', 'Odd']]), onActivate });

      nodeOf('n_a-1-2').dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onActivate).toHaveBeenCalledWith('n_a-1-2', expect.anything());
    });

    it.each([['Enter'], [' ']])('reports the node on the %j key, and stops the page scrolling', async (key) => {
      drawing(['n_m1', 'Scheduling']);
      const onActivate = vi.fn();
      await renderer.render('flowchart TB', host, { nodes: names, onActivate });
      const press = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

      nodeOf('n_m1').dispatchEvent(press);

      expect(onActivate).toHaveBeenCalledExactlyOnceWith('n_m1', nodeOf('n_m1'));
      expect(press.defaultPrevented).toBe(true);
    });

    it('ignores other keys, so Tab and the arrows still move around the page', async () => {
      drawing(['n_m1', 'Scheduling']);
      const onActivate = vi.fn();
      await renderer.render('flowchart TB', host, { nodes: names, onActivate });
      const press = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

      nodeOf('n_m1').dispatchEvent(press);

      expect(onActivate).not.toHaveBeenCalled();
      expect(press.defaultPrevented).toBe(false);
    });

    it('leaves every node plain when it is given no interaction', async () => {
      drawing(['n_m1', 'Scheduling']);

      await renderer.render('flowchart TB', host);

      expect(nodeOf('n_m1').hasAttribute('tabindex')).toBe(false);
      expect(nodeOf('n_m1').hasAttribute('role')).toBe(false);
    });

    it('wires the newest drawing and not an older one that finished late', async () => {
      let finishOlder: (drawn: { svg: string }) => void = () => undefined;
      mermaid.render.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOlder = resolve;
          }),
      );
      const olderCalls = vi.fn();
      const older = renderer.render('flowchart TB', host, { nodes: names, onActivate: olderCalls });
      await vi.waitFor(() => expect(mermaid.render).toHaveBeenCalledTimes(1));
      drawing(['n_m1', 'Scheduling']);
      const newerCalls = vi.fn();
      await renderer.render('flowchart TB', host, { nodes: names, onActivate: newerCalls });

      finishOlder({ svg: flowchart('sdc-diagram-1', ['n_m1', 'Scheduling']) });
      await older;
      nodeOf('n_m1').dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(olderCalls).not.toHaveBeenCalled();
      expect(newerCalls).toHaveBeenCalledTimes(1);
    });
  });
});
