import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { buildPackage, combinePackage, packageFileName } from '../../domain';
import type { Project } from '../../domain';
import { FileExporter } from '../../infrastructure/files/file-exporter';

/**
 * Takes the open project's design package out of the app: one file at a time, everything as one
 * document, or on the clipboard. The package is derived from the project it is given on every
 * change, so what leaves is never older than what is on screen (ADR-0004). Each action closes the menu,
 * returns the focus to its toggle and is confirmed in a live region beside it.
 */
@Component({
  selector: 'sdc-export-menu',
  templateUrl: './export-menu.component.html',
  styleUrl: './export-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'close()' },
})
export class ExportMenuComponent {
  readonly project = input.required<Project>();

  private readonly exporter = inject(FileExporter);
  private readonly toggle = viewChild.required<ElementRef<HTMLElement>>('toggle');

  protected readonly view = computed(() => {
    const project = this.project();
    const files = buildPackage(project);
    return {
      files,
      combinedName: packageFileName(project.name),
      combined: combinePackage(files, project.name),
    };
  });

  protected readonly open = signal(false);
  protected readonly done = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);

  protected toggled(event: Event): void {
    if (event.target instanceof HTMLDetailsElement) {
      this.open.set(event.target.open);
      if (event.target.open) {
        this.done.set(undefined);
        this.failure.set(undefined);
      }
    }
  }

  protected close(): void {
    if (this.open()) {
      this.open.set(false);
      this.toggle().nativeElement.focus();
    }
  }

  protected downloadFile(path: string): void {
    const file = this.view().files.find((candidate) => candidate.path === path);
    if (file) {
      this.close();
      this.exporter.download(file.path, file.markdown);
      this.report(`Downloaded ${file.path}.`);
    }
  }

  protected downloadAll(): void {
    const { combinedName, combined } = this.view();
    this.close();
    this.exporter.download(combinedName, combined);
    this.report(`Downloaded ${combinedName}.`);
  }

  protected async copyAll(): Promise<void> {
    this.close();
    const result = await this.exporter.copy(this.view().combined);
    if (result.copied) {
      this.report('Copied the whole design to the clipboard.');
    } else {
      this.done.set(undefined);
      this.failure.set(`Could not copy: ${result.reason} Download the file instead.`);
    }
  }

  private report(message: string): void {
    this.failure.set(undefined);
    this.done.set(message);
  }
}
