import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { FileExporter } from './file-exporter';

describe('FileExporter', () => {
  let exporter: FileExporter;
  let page: Window & typeof globalThis;

  beforeEach(() => {
    exporter = TestBed.inject(FileExporter);
    const view = TestBed.inject(DOCUMENT).defaultView;
    if (!view) {
      throw new Error('the test document should have a window');
    }
    page = view;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('download', () => {
    let blobs: Blob[];
    let clicked: { download: string; href: string; attached: boolean }[];
    let revoke: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      blobs = [];
      clicked = [];
      revoke = vi.fn();
      Object.assign(page.URL, {
        createObjectURL: (blob: Blob) => {
          blobs.push(blob);
          return 'blob:design-coach/1';
        },
        revokeObjectURL: revoke,
      });
      vi.spyOn(page.HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ download: this.download, href: this.href, attached: this.isConnected });
      });
    });

    afterEach(async () => {
      await new Promise((resolve) => page.setTimeout(resolve, 5));
    });

    it('saves the text as a Markdown file with the name it is given', async () => {
      exporter.download('module-design.md', '# Module design\n');

      expect(clicked).toEqual([{ download: 'module-design.md', href: 'blob:design-coach/1', attached: true }]);
      expect(blobs[0].type).toBe('text/markdown;charset=utf-8');
      expect(await blobs[0].text()).toBe('# Module design\n');
    });

    it('leaves nothing behind in the page', () => {
      exporter.download('a.md', 'x');

      expect(page.document.querySelector('a[download]')).toBeNull();
    });

    it('lets go of the file once the browser has taken it, not before', async () => {
      exporter.download('a.md', 'x');

      expect(revoke).not.toHaveBeenCalled();

      await new Promise((resolve) => page.setTimeout(resolve, 5));

      expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:design-coach/1');
    });
  });

  describe('copy', () => {
    function useClipboard(clipboard: Partial<Clipboard> | undefined): void {
      Object.defineProperty(page.navigator, 'clipboard', { value: clipboard, configurable: true });
    }

    afterEach(() => {
      Reflect.deleteProperty(page.navigator, 'clipboard');
    });

    it('puts the text on the clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      useClipboard({ writeText });

      expect(await exporter.copy('# Design\n')).toEqual({ copied: true });
      expect(writeText).toHaveBeenCalledExactlyOnceWith('# Design\n');
    });

    it('says so, with the browser\'s own reason, when the browser refuses', async () => {
      useClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError')) });

      expect(await exporter.copy('x')).toEqual({
        copied: false,
        reason: 'The browser would not let the app copy to the clipboard (Write permission denied.).',
      });
    });

    it('says so when the browser has no clipboard to offer, as on a page that is not secure', async () => {
      useClipboard(undefined);

      expect(await exporter.copy('x')).toEqual({
        copied: false,
        reason: 'This page cannot reach the clipboard, which browsers allow only on secure pages.',
      });
    });
  });
});
