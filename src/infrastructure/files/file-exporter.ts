import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

export type CopyResult = { readonly copied: true } | { readonly copied: false; readonly reason: string };

/**
 * Hands text to the person outside the app: as a file the browser saves, or on the clipboard. It is
 * the only place that knows the browser's APIs for either, so nothing inward of it touches the DOM.
 * It is called directly rather than through a port (ADR-0005): nothing varies behind it, and a test
 * of a caller replaces the class.
 */
@Injectable({ providedIn: 'root' })
export class FileExporter {
  private readonly document = inject(DOCUMENT);

  download(fileName: string, text: string): void {
    const page = this.document.defaultView;
    if (!page) {
      return;
    }
    const url = page.URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    this.document.body.append(link);
    link.click();
    link.remove();
    // Revoking in the same turn as the click can cancel the save in some browsers.
    page.setTimeout(() => page.URL.revokeObjectURL(url));
  }

  /** A refusal is returned, not thrown, so the caller has to say so: the clipboard is the one export a browser may deny. */
  async copy(text: string): Promise<CopyResult> {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) {
      return { copied: false, reason: 'This page cannot reach the clipboard, which browsers allow only on secure pages.' };
    }
    try {
      await clipboard.writeText(text);
      return { copied: true };
    } catch (error: unknown) {
      const detail = messageOf(error);
      return { copied: false, reason: `The browser would not let the app copy to the clipboard${detail === '' ? '' : ` (${detail})`}.` };
    }
  }
}

/** A DOMException is not an Error in every environment, so the message is read off whatever was thrown. */
function messageOf(error: unknown): string {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';
}
