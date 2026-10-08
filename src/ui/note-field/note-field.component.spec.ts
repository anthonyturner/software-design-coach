import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { NoteFieldComponent } from './note-field.component';

describe('NoteFieldComponent', () => {
  let fixture: ComponentFixture<NoteFieldComponent>;
  let typed: string[];

  function render(stepId: string, value: string): void {
    fixture = TestBed.createComponent(NoteFieldComponent);
    typed = [];
    fixture.componentInstance.changed.subscribe((text) => typed.push(text));
    fixture.componentRef.setInput('stepId', stepId);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  }

  /** A disclosure reports that it opened or closed in a later task, so let that settle before the next change. */
  async function show(stepId: string, value: string): Promise<void> {
    fixture.componentRef.setInput('stepId', stepId);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const disclosure = (): HTMLDetailsElement => {
    const found = page().querySelector('details');
    if (!found) {
      throw new Error('the notes should be in a disclosure');
    }
    return found;
  };
  const textarea = (): HTMLTextAreaElement => {
    const found = page().querySelector('textarea');
    if (!found) {
      throw new Error('the notes should have a textarea');
    }
    return found;
  };

  it('starts collapsed for a step with no note, behind a toggle called Notes', () => {
    render('goals', '');

    expect(disclosure().open).toBe(false);
    expect(page().querySelector('summary')?.textContent?.trim()).toBe('Notes');
  });

  it('starts open for a step that already has a note, and says so on the toggle while it is closed', () => {
    render('goals', 'Ask finance');

    expect(disclosure().open).toBe(true);
    expect(textarea().value).toBe('Ask finance');
    expect(page().querySelector('summary')?.textContent).toContain('written');
  });

  it('labels the textarea, so a screen reader announces what it is for', () => {
    render('goals', '');
    const label = page().querySelector('label');

    expect(label?.textContent?.trim()).not.toBe('');
    expect(label?.getAttribute('for')).toBe(textarea().id);
  });

  it('reports what is typed, exactly as typed', () => {
    render('goals', '');

    textarea().value = ' Ask finance\n';
    textarea().dispatchEvent(new Event('input'));

    expect(typed).toEqual([' Ask finance\n']);
  });

  it('shows a note that arrives from outside', async () => {
    render('goals', '');

    await show('goals', 'Typed elsewhere');

    expect(textarea().value).toBe('Typed elsewhere');
  });

  it('stays open while the user clears the note they are in the middle of editing', async () => {
    render('goals', 'Ask finance');

    textarea().value = '';
    textarea().dispatchEvent(new Event('input'));
    await show('goals', '');

    expect(disclosure().open).toBe(true);
  });

  it('keeps the way the user left it while they stay on the step', async () => {
    render('goals', '');
    disclosure().open = true;
    disclosure().dispatchEvent(new Event('toggle'));
    await show('goals', '');

    expect(disclosure().open).toBe(true);
  });

  it('opens or closes for the next step by whether it has a note', async () => {
    render('goals', 'Ask finance');
    await show('goals', 'Ask finance');

    await show('users', '');
    expect(disclosure().open).toBe(false);
    expect(textarea().value).toBe('');

    await show('modules', 'Is it too thin?');
    expect(disclosure().open).toBe(true);
    expect(textarea().value).toBe('Is it too thin?');
  });
});
