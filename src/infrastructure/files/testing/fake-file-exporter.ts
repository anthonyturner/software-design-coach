import type { CopyResult } from '../file-exporter';

/** Stands in for `FileExporter` in a component test: it records what would have left the app and reports what it is told to. */
export class FakeFileExporter {
  readonly downloads: { fileName: string; text: string }[] = [];
  readonly copies: string[] = [];
  copyResult: CopyResult = { copied: true };

  download(fileName: string, text: string): void {
    this.downloads.push({ fileName, text });
  }

  copy(text: string): Promise<CopyResult> {
    this.copies.push(text);
    return Promise.resolve(this.copyResult);
  }
}
