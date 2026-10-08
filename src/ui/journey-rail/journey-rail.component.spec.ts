import { TestBed } from '@angular/core/testing';
import type { JourneyStop } from '../../domain';
import { JourneyRailComponent } from './journey-rail.component';

const stops: readonly JourneyStop[] = [
  { stepId: 'problem', title: 'Problem', number: 1, state: 'done' },
  { stepId: 'users', title: 'Users', number: 2, state: 'current' },
  { stepId: 'goals', title: 'Goals', number: 3, state: 'in-progress' },
  { stepId: 'non-goals', title: 'Non-goals', number: 4, state: 'not-started' },
];

describe('JourneyRailComponent', () => {
  function render(): { page: HTMLElement; picked: string[] } {
    const fixture = TestBed.createComponent(JourneyRailComponent);
    const picked: string[] = [];
    fixture.componentInstance.selected.subscribe((id) => picked.push(id));
    fixture.componentRef.setInput('stops', stops);
    fixture.detectChanges();
    return { page: fixture.nativeElement as HTMLElement, picked };
  }

  const buttons = (page: HTMLElement): HTMLButtonElement[] => Array.from(page.querySelectorAll('button'));

  it('is a labelled navigation landmark listing every step in order', () => {
    const { page } = render();

    expect(page.querySelector('nav')?.getAttribute('aria-label')).toBe('Design journey');
    expect(buttons(page).map((button) => button.querySelector('.rail__name')?.textContent)).toEqual([
      '1. Problem',
      '2. Users',
      '3. Goals',
      '4. Non-goals',
    ]);
  });

  it('tells assistive technology each step state, and marks the current step once, by aria-current alone', () => {
    const { page } = render();

    expect(buttons(page).map((button) => button.querySelector('.rail__state')?.textContent ?? null)).toEqual([
      ', done',
      null,
      ', in progress',
      ', not started',
    ]);
    expect(buttons(page).map((button) => button.getAttribute('aria-current'))).toEqual([null, 'step', null, null]);
  });

  it('reports the step clicked, whatever its state, so navigation is free', () => {
    const { page, picked } = render();

    buttons(page)[3].click();
    buttons(page)[0].click();

    expect(picked).toEqual(['non-goals', 'problem']);
  });

  it('can be reached and used from the keyboard because each step is a button', () => {
    const { page } = render();

    expect(buttons(page).every((button) => button.type === 'button' && !button.disabled && button.tabIndex === 0)).toBe(true);
  });
});
