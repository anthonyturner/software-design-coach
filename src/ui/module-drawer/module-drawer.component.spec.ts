import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ModuleDetails } from '../../domain';
import { ModuleDrawerComponent } from './module-drawer.component';

const scheduling: ModuleDetails = {
  id: 'm1',
  name: 'Scheduling',
  purpose: 'Owns appointment times',
  responsibilities: ['Find a free slot', 'Hold the slot'],
  hides: 'The calendar rules',
  interfaceSketch: 'book(slot): Booking',
  dependencies: ['Storage'],
  dependents: ['Notifier', 'Reports'],
};

describe('ModuleDrawerComponent', () => {
  let fixture: ComponentFixture<ModuleDrawerComponent>;
  let closed: number;

  beforeEach(() => {
    closed = 0;
    fixture = TestBed.createComponent(ModuleDrawerComponent);
    fixture.componentInstance.closed.subscribe(() => (closed += 1));
  });

  afterEach(() => {
    fixture.destroy();
  });

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const dialog = (): HTMLElement => {
    const found = page().querySelector<HTMLElement>('[role="dialog"]');
    if (!found) {
      throw new Error('the drawer should be a dialog');
    }
    return found;
  };
  const section = (heading: string): HTMLElement | undefined =>
    [...page().querySelectorAll<HTMLElement>('.drawer__section')].find(
      (found) => found.querySelector('h4')?.textContent === heading,
    );
  const items = (heading: string): (string | undefined)[] =>
    [...(section(heading)?.querySelectorAll('li') ?? [])].map((item) => item.textContent?.trim());

  async function open(module: ModuleDetails): Promise<void> {
    fixture.componentRef.setInput('module', module);
    await fixture.whenStable();
  }

  it('is a dialog named by the module it shows', async () => {
    await open(scheduling);

    const title = page().querySelector('h3');
    expect(title?.textContent).toBe('Scheduling');
    expect(dialog().getAttribute('aria-labelledby')).toBe(title?.id);
  });

  it('shows what the module owns, hides and offers, in the user\'s words', async () => {
    await open(scheduling);

    expect(section('Purpose')?.textContent).toContain('Owns appointment times');
    expect(items('Responsibilities')).toEqual(['Find a free slot', 'Hold the slot']);
    expect(section('Hides')?.textContent).toContain('The calendar rules');
    expect(section('Interface sketch')?.querySelector('pre')?.textContent).toBe('book(slot): Booking');
  });

  it('names the modules it depends on and the ones that need it', async () => {
    await open(scheduling);

    expect(items('Depends on')).toEqual(['Storage']);
    expect(items('Needed by')).toEqual(['Notifier', 'Reports']);
  });

  it('says what is missing instead of leaving a heading empty', async () => {
    await open({ ...scheduling, purpose: '', responsibilities: [], dependencies: [], dependents: [] });

    expect(section('Purpose')?.textContent).toContain('Nothing written yet.');
    expect(section('Responsibilities')?.textContent).toContain('Nothing written yet.');
    expect(section('Depends on')?.textContent).toContain('Nothing.');
    expect(section('Needed by')?.textContent).toContain('Nothing.');
  });

  it('has nothing to edit, only a Close button', async () => {
    await open(scheduling);

    expect(page().querySelectorAll('input, textarea, select')).toHaveLength(0);
    expect([...page().querySelectorAll('button')].map((button) => button.textContent?.trim())).toEqual(['Close']);
  });

  it('moves focus into itself when it opens', async () => {
    await open(scheduling);

    expect(document.activeElement).toBe(dialog());
  });

  it('moves focus to itself again when it is asked to show another module', async () => {
    await open(scheduling);
    page().querySelector('button')?.focus();

    await open({ ...scheduling, id: 'm2', name: 'Notifier' });

    expect(document.activeElement).toBe(dialog());
    expect(page().querySelector('h3')?.textContent).toBe('Notifier');
  });

  it('leaves focus alone when the same module is shown with new words', async () => {
    await open(scheduling);
    page().querySelector('button')?.focus();

    await open({ ...scheduling, purpose: 'Owns the calendar' });

    expect(document.activeElement).toBe(page().querySelector('button'));
  });

  it('asks to be closed on Escape, wherever focus is on the page', async () => {
    await open(scheduling);
    document.body.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(closed).toBe(1);
  });

  it('asks to be closed from the Close button', async () => {
    await open(scheduling);

    page().querySelector('button')?.click();

    expect(closed).toBe(1);
  });

  it('does not trap Tab: it is a dialog that does not hold the page', async () => {
    await open(scheduling);
    const press = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

    dialog().dispatchEvent(press);

    expect(press.defaultPrevented).toBe(false);
    expect(dialog().hasAttribute('aria-modal')).toBe(false);
  });

  it('stops listening for Escape once it is gone', async () => {
    await open(scheduling);
    fixture.destroy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(closed).toBe(0);
  });
});
