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
});
