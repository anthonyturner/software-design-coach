import { TestBed } from '@angular/core/testing';
import type { SummaryValue } from '../../domain';
import { SummaryValueComponent } from './summary-value.component';

describe('SummaryValueComponent', () => {
  async function show(value: SummaryValue): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(SummaryValueComponent);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows text as a paragraph', async () => {
    const page = await show({ kind: 'text', text: 'No-shows cost us chairs' });

    expect(page.querySelector('p')?.textContent).toBe('No-shows cost us chairs');
    expect(page.querySelector('ul')).toBeNull();
  });

  it('shows a list as a list, one item to a line', async () => {
    const page = await show({ kind: 'list', items: ['fewer no-shows', 'no calls'] });

    expect([...page.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['fewer no-shows', 'no calls']);
    expect(page.querySelector('p')).toBeNull();
  });
});
