import { TestBed } from '@angular/core/testing';
import type { ChoiceQuestion } from '../../domain';
import { ChoiceFieldComponent } from './choice-field.component';

describe('ChoiceFieldComponent', () => {
  const question: ChoiceQuestion = {
    id: 'kind',
    prompt: 'What kind of thing are you building?',
    kind: 'choice',
    hint: 'Pick the closest.',
    options: [
      { value: 'application', label: 'An application' },
      { value: 'service', label: 'A service' },
    ],
  };

  function render(value?: string): { page: HTMLElement; answers: string[] } {
    const fixture = TestBed.createComponent(ChoiceFieldComponent);
    const answers: string[] = [];
    fixture.componentInstance.answered.subscribe((answer) => answers.push(answer));
    fixture.componentRef.setInput('question', question);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return { page: fixture.nativeElement as HTMLElement, answers };
  }

  const radios = (page: HTMLElement): HTMLInputElement[] =>
    Array.from(page.querySelectorAll<HTMLInputElement>('input[type="radio"]'));

  it('groups the options under the prompt, each labelled', () => {
    const { page } = render();

    expect(page.querySelector('legend')?.textContent).toBe(question.prompt);
    expect([...page.querySelectorAll('label')].map((label) => label.textContent?.trim())).toEqual([
      'An application',
      'A service',
    ]);
    expect(new Set(radios(page).map((radio) => radio.name)).size).toBe(1);
  });

  it('says more under an option that has a detail, tied to its radio without lengthening the radio name', () => {
    const fixture = TestBed.createComponent(ChoiceFieldComponent);
    fixture.componentRef.setInput('question', {
      ...question,
      options: [{ value: 'application', label: 'An application', detail: 'People use it directly.' }, question.options[1]],
    });
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const [first, second] = radios(page);
    const detail = page.querySelector('.choice__detail');
    expect(detail?.textContent).toBe('People use it directly.');
    expect(first.getAttribute('aria-describedby')).toBe(detail?.id);
    expect(second.hasAttribute('aria-describedby')).toBe(false);
    expect([...page.querySelectorAll('label')].map((label) => label.textContent?.trim())).toEqual(['An application', 'A service']);
  });

  it('checks the option that is the current answer', () => {
    const { page } = render('service');

    expect(radios(page).map((radio) => radio.checked)).toEqual([false, true]);
  });

  it('answers with the value of the option picked', () => {
    const { page, answers } = render();

    radios(page)[1].click();

    expect(answers).toEqual(['service']);
  });
});
