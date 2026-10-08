import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { addEntity, answer, buildPackage, combinePackage, createProject, updateEntity } from '../../domain';
import type { Project } from '../../domain';
import { FileExporter } from '../../infrastructure/files/file-exporter';
import { FakeFileExporter } from '../../infrastructure/files/testing/fake-file-exporter';
import { ExportMenuComponent } from './export-menu.component';

const now = '2026-10-08T09:00:00.000Z';

function reminders(name = 'Order Service'): Project {
  let project = createProject({ id: 'p1', name, mode: 'new-project', now });
  project = answer(project, 'problem', 'problem', 'No-shows cost us chairs', now);
  return updateEntity(addEntity(project, 'actor', 'a1', now), 'actor', 'a1', { name: 'Receptionist' }, now);
}

describe('ExportMenuComponent', () => {
  let fixture: ComponentFixture<ExportMenuComponent>;
  let exporter: FakeFileExporter;

  beforeEach(() => {
    exporter = new FakeFileExporter();
    TestBed.configureTestingModule({ providers: [{ provide: FileExporter, useValue: exporter }] });
    fixture = TestBed.createComponent(ExportMenuComponent);
    fixture.componentRef.setInput('project', reminders());
    fixture.detectChanges();
  });

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const must = <T extends Element>(found: T | null, what: string): T => {
    if (!found) {
      throw new Error(`The menu should have ${what}`);
    }
    return found;
  };
  const toggle = (): HTMLElement => must(page().querySelector<HTMLElement>('summary'), 'a toggle');
  const details = (): HTMLDetailsElement => must(page().querySelector('details'), 'a disclosure');
  const items = (): string[] => [...page().querySelectorAll('.export__item')].map((item) => item.textContent?.trim() ?? '');
  const item = (name: string): HTMLButtonElement =>
    must(
      [...page().querySelectorAll<HTMLButtonElement>('.export__item')].find((found) => found.textContent?.includes(name)) ?? null,
      `an item "${name}"`,
    );
  const status = (): string | undefined => page().querySelector('[role="status"]')?.textContent?.trim();
  const alert = (): string | undefined => page().querySelector('[role="alert"]')?.textContent?.trim();

  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  async function openMenu(): Promise<void> {
    toggle().click();
    await settle();
  }

  it('starts closed, behind a toggle named Export', () => {
    expect(details().open).toBe(false);
    expect(toggle().textContent?.trim()).toContain('Export');
  });

  it('offers the whole design as one file or on the clipboard, then every file of the package', async () => {
    await openMenu();

    expect(details().open).toBe(true);
    expect(items()).toEqual([
      'Download all as one file order-service-design-package.md',
      'Copy all as Markdown',
      ...buildPackage(reminders()).map((file) => file.path),
    ]);
  });

  it('puts every item on a real button, so it takes Tab, Enter and Space', async () => {
    await openMenu();

    for (const found of page().querySelectorAll('.export__item')) {
      expect(found.tagName).toBe('BUTTON');
      expect(found.getAttribute('type')).toBe('button');
    }
  });

  it('downloads one file of the package under its own name', async () => {
    await openMenu();
    item('module-design.md').click();
    await settle();

    const expected = buildPackage(reminders()).find((file) => file.path === 'module-design.md');
    expect(exporter.downloads).toEqual([{ fileName: 'module-design.md', text: expected?.markdown }]);
    expect(status()).toBe('Downloaded module-design.md.');
  });

  it('downloads everything as one file, named for the project, with a contents list', async () => {
    await openMenu();
    item('Download all as one file').click();
    await settle();

    expect(exporter.downloads).toEqual([
      { fileName: 'order-service-design-package.md', text: combinePackage(buildPackage(reminders()), 'Order Service') },
    ]);
    expect(exporter.downloads[0].text).toContain('## Contents');
    expect(status()).toBe('Downloaded order-service-design-package.md.');
  });

  it('copies the same combined Markdown to the clipboard and says it did', async () => {
    await openMenu();
    item('Copy all as Markdown').click();
    await settle();

    expect(exporter.copies).toEqual([combinePackage(buildPackage(reminders()), 'Order Service')]);
    expect(status()).toBe('Copied the whole design to the clipboard.');
    expect(alert()).toBeUndefined();
  });

  it('says why when the clipboard cannot be used, in an alert, and claims no success', async () => {
    exporter.copyResult = { copied: false, reason: 'The browser blocked it.' };
    await openMenu();
    item('Copy all as Markdown').click();
    await settle();

    expect(alert()).toBe('Could not copy: The browser blocked it. Download the file instead.');
    expect(status()).toBe('');
  });

  it('closes after an item is chosen and puts the focus back on the toggle, so the confirmation is where the user is', async () => {
    await openMenu();
    item('problem.md').click();
    await settle();

    expect(details().open).toBe(false);
    expect(document.activeElement).toBe(toggle());
  });

  it('closes on Escape and puts the focus back on the toggle', async () => {
    await openMenu();
    item('problem.md').focus();
    item('problem.md').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    expect(details().open).toBe(false);
    expect(document.activeElement).toBe(toggle());
  });

  it('forgets the last confirmation when the menu is opened again, so the next one is announced afresh', async () => {
    await openMenu();
    item('problem.md').click();
    await settle();
    expect(status()).toBe('Downloaded problem.md.');

    await openMenu();

    expect(status()).toBe('');
  });

  it('follows the project, so an export is never of an older design', async () => {
    fixture.componentRef.setInput('project', reminders('Billing'));
    await settle();
    await openMenu();
    item('Download all as one file').click();
    await settle();

    expect(exporter.downloads[0].fileName).toBe('billing-design-package.md');
    expect(exporter.downloads[0].text).toContain('# Billing: design package');
  });
});
